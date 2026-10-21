import { isRecord } from './parse'
import { isMoves, parseEvent, TICK, type Replay, type ReplayEvent } from './replay'

/**
 * Replay streaming: while a ranked run plays, its replay reaches the API in
 * chunks, each about when it was played. A chunk that's in commits its
 * inputs: the run's report must keep them, so nobody can search a run
 * offline (die, rewind, try again) and send the best path later. Shared by
 * the game (which cuts the chunks) and the API (which takes them, times them
 * and checks the report against them). Pure. See `server/README.md`, "Ranked runs".
 */

export const STREAM = {
  /** Ticks per chunk: the game cuts one every 15 s of play. */
  ticks: 15 * 60,
  /** The most ticks one chunk may hold (a frame steps a few ticks past `ticks`). */
  maxTicks: 30 * 60,
  /** The most events one chunk may hold. */
  maxEvents: 2000,
  /** Ticks a report may add past what its chunks committed: the run's last moments, sent with the result. */
  tailTicks: 30 * 60,
  /** Seconds a commitment may come late (`commitLag`) before, with `STREAM_ENFORCE` on, the run stays off the boards. */
  lagTolerance: 3 * 60,
} as const

/** A stretch of a replay: its stick (run-length encoded like `Replay.moves`) and its events, with their absolute ticks. */
export type Segment = Pick<Replay, 'moves' | 'events'>

/** The ticks `[from, to)` of a run's replay, as the game sends them (`PUT /runs/:token/chunks/:seq`). */
export type ReplayChunk = Segment & { from: number; to: number }

/**
 * Where a replay was cut: the tick, the move pair holding it and how many of
 * that pair's ticks came before, and the first event at or past it.
 */
export type StreamCursor = { tick: number; pair: number; into: number; event: number }

export const STREAM_START: StreamCursor = { tick: 0, pair: 0, into: 0, event: 0 }

/** Adds `count` ticks of `code` to run-length encoded moves, merging with the last run. */
const appendRun = (moves: number[], code: number, count: number) => {
  if (moves.length > 0 && moves[moves.length - 2] === code) moves[moves.length - 1]! += count
  else moves.push(code, count)
}

/**
 * The stretch of `replay` from `at` up to tick `to` (left out), canonical
 * (equal runs merged), and the cursor the next stretch starts from. It only
 * reads that stretch, so the game cuts its recorder as it grows: the last
 * run of moves may keep growing past a cut, and the next cut picks it up.
 */
export const cutReplay = (replay: Segment, at: StreamCursor, to: number): { segment: Segment; next: StreamCursor } => {
  const src = replay.moves
  const moves: number[] = []
  let { tick, pair, into } = at
  while (tick < to && pair < src.length) {
    const count = src[pair + 1]!
    if (into >= count) {
      pair += 2
      into = 0
      continue
    }
    const take = Math.min(count - into, to - tick)
    appendRun(moves, src[pair]!, take)
    tick += take
    into += take
  }
  let event = at.event
  while (event < replay.events.length && replay.events[event]![0] < tick) event++
  return { segment: { moves, events: replay.events.slice(at.event, event) }, next: { tick, pair, into, event } }
}

/** How many ticks run-length encoded moves hold. */
export const ticksOf = (moves: readonly number[]) => {
  let ticks = 0
  for (let i = 1; i < moves.length; i += 2) ticks += moves[i]!
  return ticks
}

/** A segment as one string, the same for the same inputs: what a report's digest is taken of. */
export const segmentKey = (s: Segment) => JSON.stringify([s.moves, s.events])

const sameEvent = (a: ReplayEvent, b: ReplayEvent) => a.length === b.length && a.every((v, i) => v === b[i])

/** Whether two canonical segments hold the same inputs. */
export const sameSegment = (a: Segment, b: Segment) =>
  a.moves.length === b.moves.length &&
  a.moves.every((v, i) => v === b.moves[i]) &&
  a.events.length === b.events.length &&
  a.events.every((e, i) => sameEvent(e, b.events[i]!))

const isWhole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

/**
 * A chunk from an untrusted body, canonical, or null when its shape is wrong:
 * `STREAM.ticks` to `STREAM.maxTicks` ticks, moves that add up to them and at
 * most `STREAM.maxEvents` events, in order, all inside its ticks.
 */
export const parseChunk = (raw: unknown): ReplayChunk | null => {
  if (!isRecord(raw) || !isWhole(raw.from) || !isWhole(raw.to) || !Array.isArray(raw.moves) || !Array.isArray(raw.events)) return null
  const { from, to } = raw
  if (to - from < STREAM.ticks || to - from > STREAM.maxTicks || raw.events.length > STREAM.maxEvents) return null
  if (!isMoves(raw.moves) || ticksOf(raw.moves) !== to - from) return null
  const events = raw.events.map(parseEvent)
  if (events.some((e, i) => e === null || e[0] < from || e[0] >= to || (i > 0 && e[0] < events[i - 1]![0]))) return null
  const { segment } = cutReplay({ moves: raw.moves, events: events as ReplayEvent[] }, { ...STREAM_START, tick: from }, to)
  return { from, to, ...segment }
}

/**
 * Seconds a commitment of the ticks `[from, to)` came late: how long after
 * the last one (`last`, or when the seed was dealt) it arrived (`arrived`),
 * past the play its new ticks take (those from `pinned`, the ticks a report
 * already committed, are no play of its own). Real time only runs ahead of
 * game time (pauses, level-up screens, the results screen before endless
 * mode), so an honest stream lags by what it waited and the network; a bot
 * that searches offline lags by its search.
 */
export const commitLag = (span: { from: number; to: number }, pinned: number, arrived: number, last: number) =>
  arrived - last - Math.max(0, span.to - Math.max(span.from, pinned)) * TICK

/**
 * What the stream already committed when a report comes in: the ticks the
 * last report pinned (`ticks`, by `digest` of their `segmentKey`; none
 * before the first), the chunks since, in order, and where the next chunk
 * would start (`streamed`).
 */
export type Committed = { pinned: { ticks: number; digest: string | null }; chunks: ReplayChunk[]; streamed: number }

/**
 * Checks a run's reported replay against what its stream committed, or
 * `rewrite` when it changes any committed tick. A report of fewer ticks than
 * the chunks (endless chunks that got in before an older report) is fine: it
 * keeps what they share. Otherwise it returns what the report itself
 * commits: the ticks it pins (all of its own, with their digest by `hash`;
 * the chunks inside them are done with) and its `tail`, how many ticks it
 * brought past the stream.
 */
export const settleReport = (replay: Segment, committed: Committed, hash: (key: string) => string) => {
  const total = ticksOf(replay.moves)
  const { pinned, chunks } = committed
  if (pinned.ticks > total) return { ok: false } as const
  const head = cutReplay(replay, STREAM_START, pinned.ticks)
  if (pinned.digest !== null && hash(segmentKey(head.segment)) !== pinned.digest) return { ok: false } as const
  let at = STREAM_START
  for (const c of chunks) {
    const end = Math.min(c.to, total)
    if (end <= c.from) break
    at = cutReplay(replay, at, c.from).next
    const mine = cutReplay(replay, at, end)
    at = mine.next
    const theirs = end === c.to ? c : cutReplay(c, { ...STREAM_START, tick: c.from }, end).segment
    if (!sameSegment(mine.segment, theirs)) return { ok: false } as const
  }
  return {
    ok: true,
    total,
    tail: Math.max(0, total - Math.max(pinned.ticks, committed.streamed)),
    pin: { ticks: total, digest: hash(segmentKey(cutReplay(replay, STREAM_START, total).segment)) },
  } as const
}

/**
 * Whether a report was streamed in time: its tail is at most
 * `STREAM.tailTicks` and no commitment came more than `STREAM.lagTolerance`
 * late (`lag`, the worst; null when none was timed).
 */
export const streamedInTime = (s: { tail: number; lag: number | null }) => s.tail <= STREAM.tailTicks && (s.lag ?? 0) <= STREAM.lagTolerance

/**
 * Whether a run goes on the public boards, by its stream: always while the
 * API only observes (`enforce` off); with enforcement, only streamed in time.
 */
export const boardListed = (s: { tail: number; lag: number | null }, enforce: boolean) => !enforce || streamedInTime(s)
