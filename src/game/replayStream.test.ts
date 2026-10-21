import { describe, expect, it } from 'vitest'
import { recordEvent, recordStep, startRecording, TICK, type Recorder, type ReplayStart } from './replay'
import { NO_RANKS } from './meta'
import { boardListed, commitLag, cutReplay, parseChunk, settleReport, STREAM, STREAM_START, ticksOf, type ReplayChunk, type StreamCursor } from './replayStream'

const START: ReplayStart = { seed: 7, starter: 'squirtle', difficulty: 'normal', ranks: NO_RANKS, shiny: false, luckyEgg: false, outbreak: null, halloween: false, bag: [], view: { w: 480, h: 270 } }

const VIEW = { w: 480, h: 270 }

/** Records `ticks` steps whose stick changes every 7 ticks (and holds for long stretches now and then), with a press every 50. */
const record = (rec: Recorder, ticks: number) => {
  for (let n = 0; n < ticks; n++) {
    const t = rec.tick
    if (t % 50 === 0) recordEvent(rec, ['special'])
    const dir = t % 400 < 200 ? 0 : Math.floor(t / 7) % 8
    recordStep(rec, VIEW, { x: Math.cos(dir), y: Math.sin(dir) })
  }
}

/** Cuts the recorder like the game does while it plays: a chunk every `STREAM.ticks` (a frame can step past it). */
const stream = (rec: Recorder, ticks: number, chunks: ReplayChunk[] = [], at: { cursor: StreamCursor } = { cursor: STREAM_START }) => {
  for (let n = 0; n < ticks; n += 3) {
    record(rec, 3)
    if (rec.tick - at.cursor.tick >= STREAM.ticks) {
      const { segment, next } = cutReplay(rec.replay, at.cursor, rec.tick)
      chunks.push({ from: at.cursor.tick, to: next.tick, ...segment })
      at.cursor = next
    }
  }
  return { chunks, at }
}

/** The stick tick by tick, and back to run-length encoding. */
const expand = (moves: number[]) => moves.flatMap((code, i) => (i % 2 === 0 ? Array<number>(moves[i + 1]!).fill(code) : []))
const encode = (codes: number[]) => cutReplay({ moves: codes.flatMap((c) => [c, 1]), events: [] }, STREAM_START, codes.length).segment.moves

/** Not a real digest: the key itself, so the tests read what was pinned. */
const id = (key: string) => key

describe('cutReplay', () => {
  it('cuts a growing recorder into chunks that join back into the replay', () => {
    const rec = startRecording(START)
    const { chunks, at } = stream(rec, 5000)
    expect(chunks.length).toBe(5)
    chunks.forEach((c, i) => {
      expect(c.from).toBe(i === 0 ? 0 : chunks[i - 1]!.to)
      expect(ticksOf(c.moves)).toBe(c.to - c.from)
      expect(c.events.every((e) => e[0] >= c.from && e[0] < c.to)).toBe(true)
    })
    const tail = cutReplay(rec.replay, at.cursor, rec.tick).segment
    expect([...chunks, tail].flatMap((c) => c.events)).toEqual(rec.replay.events)
    expect(encode([...chunks, tail].flatMap((c) => expand(c.moves)))).toEqual(rec.replay.moves)
  })

  it('picks up a run of moves that kept growing past the cut', () => {
    const replay = { moves: [5, 10], events: [] }
    const first = cutReplay(replay, STREAM_START, 10)
    replay.moves[1] = 25
    expect(cutReplay(replay, first.next, 25).segment.moves).toEqual([5, 15])
  })
})

describe('parseChunk', () => {
  const chunk = { from: 900, to: 1800, moves: [3, 400, 3, 100, 0, 400], events: [[900, 'special'], [1799, 'offer', 2]] }

  it('takes a chunk and merges its equal runs', () => {
    expect(parseChunk(chunk)).toEqual({ from: 900, to: 1800, moves: [3, 500, 0, 400], events: [[900, 'special'], [1799, 'offer', 2]] })
  })

  it('refuses a chunk whose moves miss its ticks, too short or too long', () => {
    expect(parseChunk({ ...chunk, moves: [3, 899] })).toBeNull()
    expect(parseChunk({ ...chunk, to: 1000, moves: [3, 100] })).toBeNull()
    expect(parseChunk({ ...chunk, to: 900 + STREAM.maxTicks + 1, moves: [3, STREAM.maxTicks + 1] })).toBeNull()
  })

  it('refuses events outside its ticks or out of order', () => {
    expect(parseChunk({ ...chunk, events: [[1800, 'special']] })).toBeNull()
    expect(parseChunk({ ...chunk, events: [[899, 'special']] })).toBeNull()
    expect(parseChunk({ ...chunk, events: [[1000, 'special'], [950, 'special']] })).toBeNull()
  })
})

describe('settleReport', () => {
  const unpinned = { ticks: 0, digest: null }

  it('takes a report that keeps every chunk, with the tail it brought', () => {
    const rec = startRecording(START)
    const { chunks } = stream(rec, 3000)
    const settled = settleReport(rec.replay, { pinned: unpinned, chunks, streamed: chunks.at(-1)!.to }, id)
    expect(settled).toMatchObject({ ok: true, total: rec.tick, tail: rec.tick - chunks.at(-1)!.to })
  })

  it('refuses a report that rewrites a committed tick', () => {
    const rec = startRecording(START)
    const { chunks } = stream(rec, 3000)
    // The stick of tick 1000 goes elsewhere.
    const codes = expand(rec.replay.moves)
    codes[1000] = (codes[1000]! % 200) + 1
    expect(settleReport({ moves: encode(codes), events: rec.replay.events }, { pinned: unpinned, chunks, streamed: chunks.at(-1)!.to }, id).ok).toBe(false)
    // An event moved within a committed chunk.
    const shifted = { moves: rec.replay.moves, events: rec.replay.events.map((e) => (e[0] === 100 ? ([101, 'special'] as const) : e)) }
    expect(settleReport(shifted, { pinned: unpinned, chunks, streamed: chunks.at(-1)!.to }, id).ok).toBe(false)
  })

  it('takes an older report the endless chunks already went past', () => {
    const rec = startRecording(START)
    const { chunks, at } = stream(rec, 2000)
    const victory = structuredClone(rec.replay)
    stream(rec, 2000, chunks, at)
    const settled = settleReport(victory, { pinned: unpinned, chunks, streamed: chunks.at(-1)!.to }, id)
    expect(settled).toMatchObject({ ok: true, tail: 0, total: 2001 })
  })

  it('holds a later report (endless mode) to the ticks the first one pinned', () => {
    const rec = startRecording(START)
    const { chunks, at } = stream(rec, 2000)
    const first = settleReport(rec.replay, { pinned: unpinned, chunks, streamed: chunks.at(-1)!.to }, id)
    if (!first.ok) throw new Error('first report refused')
    const later: ReplayChunk[] = []
    stream(rec, 2000, later, at)
    expect(settleReport(rec.replay, { pinned: first.pin, chunks: later, streamed: later.at(-1)!.to }, id).ok).toBe(true)
    // The same run with its first stretch played otherwise.
    const codes = expand(rec.replay.moves)
    codes.fill(0, 0, 10)
    expect(settleReport({ moves: encode(codes), events: rec.replay.events }, { pinned: first.pin, chunks: later, streamed: later.at(-1)!.to }, id).ok).toBe(false)
    // Or cut short of what it pinned.
    expect(settleReport({ moves: [0, 10], events: [] }, { pinned: first.pin, chunks: [], streamed: 0 }, id).ok).toBe(false)
  })
})

describe('commitLag', () => {
  it('is how late the new ticks came, past their own play', () => {
    // 15 s of ticks arriving 16 s after the last commitment: 1 s late.
    expect(commitLag({ from: 0, to: 900 }, 0, 116, 100)).toBeCloseTo(1)
    // A pause of 2 minutes inside the chunk shows in full.
    expect(commitLag({ from: 900, to: 1800 }, 0, 100 + 15 + 120, 100)).toBeCloseTo(120)
    // Ticks a report already pinned take no play: the wait on the results screen before endless mode counts.
    expect(commitLag({ from: 900, to: 1800 }, 1500, 100 + 300 * TICK + 60, 100)).toBeCloseTo(60)
  })
})

describe('boardListed', () => {
  it('lists every run while only observing', () => {
    expect(boardListed({ tail: 99_999, lag: 9_999 }, false)).toBe(true)
  })

  it('with enforcement, lists only runs streamed in time', () => {
    expect(boardListed({ tail: 600, lag: 4 }, true)).toBe(true)
    expect(boardListed({ tail: 600, lag: null }, true)).toBe(true)
    expect(boardListed({ tail: 600, lag: STREAM.lagTolerance + 1 }, true)).toBe(false)
    // A game that didn't stream: the whole run is its tail.
    expect(boardListed({ tail: 60 * 60 * 20, lag: null }, true)).toBe(false)
  })
})
