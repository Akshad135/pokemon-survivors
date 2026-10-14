import { Worker } from 'node:worker_threads'
import type { Replay, Resimulated } from '../../src/game/replay'
import type { RankingStore } from './ranking'

type Answer = { result: Resimulated; ms: number }

/** Re-simulates one replay; null when the machinery failed (not the run). */
type Runner = (id: string, replay: unknown) => Promise<Answer | null>

/**
 * The bundled worker (`dist/verify.js`, next to `index.js`): a long run's
 * seconds of simulation never hold up the API's requests. A crash (a replay
 * that blows the heap) fails only that check; the next one gets a fresh worker.
 */
const workerRunner = (): Runner => {
  let worker: Worker | null = null
  let waiting: ((answer: Answer | null) => void) | null = null
  const settle = (answer: Answer | null) => {
    waiting?.(answer)
    waiting = null
  }
  const start = () => {
    const w = new Worker(new URL('./verify.js', import.meta.url))
    w.on('message', settle)
    w.on('error', (err) => {
      console.error('check worker', err)
      worker = null
      settle(null)
    })
    w.unref()
    return w
  }
  return (id, replay) =>
    new Promise((resolve) => {
      worker ??= start()
      waiting = resolve
      worker.postMessage({ id, replay })
    })
}

/** `npm run dev` runs the source under tsx, where a worker can't load it: re-simulate in place (it blocks, fine in dev). */
const inlineRunner = (): Runner => async (_id, replay) => {
  const { resimulate } = await import('../../src/game/replay')
  const t0 = performance.now()
  const result = resimulate(replay as Replay)
  return { result, ms: Math.round(performance.now() - t0) }
}

/**
 * Re-simulation of ranked runs, one at a time, after the API has answered. A
 * run is verified when its replay ends on the same time, faints and level it
 * reported; otherwise it's marked failed and leaves the boards. When the
 * machinery fails instead, the run stays pending for the next start.
 * `schedule` queues a run (again, if it grew in endless mode); `resume`
 * queues whatever was pending when the server last stopped.
 */
export const createChecks = (ranking: RankingStore) => {
  const run: Runner = import.meta.url.endsWith('.ts') ? inlineRunner() : workerRunner()
  const queue: string[] = []
  let busy = false

  const drain = async () => {
    if (busy) return
    busy = true
    while (queue.length > 0) {
      const id = queue.shift()!
      try {
        const reported = await ranking.runToCheck(id)
        if (!reported) continue
        const answer = await run(id, reported.replay)
        if (!answer) continue
        const r = answer.result
        const ok = !r.stuck && r.time === reported.time && r.kills === reported.kills && r.level === reported.level
        await ranking.setVerified(id, reported.time, ok, answer.ms)
        console.log(`check ${id}: ${ok ? 'verified' : 'failed'} in ${answer.ms} ms`)
      } catch (err) {
        console.error('check failed', id, err)
      }
    }
    busy = false
  }

  return {
    schedule: (id: string) => {
      if (!queue.includes(id)) queue.push(id)
      void drain()
    },
    resume: async () => {
      queue.push(...(await ranking.uncheckedRuns()).filter((id) => !queue.includes(id)))
      void drain()
    },
  }
}

export type Checks = ReturnType<typeof createChecks>
