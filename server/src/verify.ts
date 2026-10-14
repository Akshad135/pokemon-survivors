import { parentPort } from 'node:worker_threads'
import { resimulate, type Replay } from '../../src/game/replay'

/**
 * Worker thread that re-simulates replays (`checks.ts` starts it), so a long
 * run's seconds of simulation never hold up the API's requests. Takes
 * `{ id, replay }`, answers `{ id, result, ms }`.
 */
parentPort?.on('message', ({ id, replay }: { id: string; replay: Replay }) => {
  const t0 = performance.now()
  const result = resimulate(replay)
  parentPort?.postMessage({ id, result, ms: Math.round(performance.now() - t0) })
})
