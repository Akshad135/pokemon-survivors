/**
 * Frame pacing as the shell sees it (time between two display frames): a short
 * rolling window for "right now" (the crash watch) and a run's histogram for
 * its summary on `run_end`. Recording a frame allocates nothing.
 */

/** Frames in the rolling window: about two seconds at 60 Hz. */
const WINDOW = 120
/** 1 ms buckets; the last holds every frame past it. */
const BUCKETS = 101
/** A frame longer than this is a visible hitch. */
export const LONG_FRAME_MS = 50
/** A gap this long isn't a frame: the page was in the background. */
const GAP_MS = 1000

export type FrameStats = {
  recent: Float32Array
  /** Where the next frame goes in `recent`, and how much of it is filled. */
  at: number
  filled: number
  /** The run's frames by whole ms, their count, total time and the long ones. */
  hist: Uint32Array
  frames: number
  totalMs: number
  long: number
}

export const frameStats = (): FrameStats => ({ recent: new Float32Array(WINDOW), at: 0, filled: 0, hist: new Uint32Array(BUCKETS), frames: 0, totalMs: 0, long: 0 })

/** Notes a frame `ms` long; `inRun` also counts it in the run's summary (frames while playing). */
export const recordFrame = (s: FrameStats, ms: number, inRun: boolean) => {
  if (!(ms > 0) || ms >= GAP_MS) return
  s.recent[s.at] = ms
  s.at = (s.at + 1) % WINDOW
  if (s.filled < WINDOW) s.filled++
  if (!inRun) return
  s.hist[Math.min(BUCKETS - 1, Math.floor(ms))]!++
  s.frames++
  s.totalMs += ms
  if (ms > LONG_FRAME_MS) s.long++
}

const tenths = (v: number) => Math.round(v * 10) / 10

/** The average frame (ms) over the rolling window; null before any frame. */
export const recentFrameMs = (s: FrameStats) => {
  if (s.filled === 0) return null
  let sum = 0
  for (let i = 0; i < s.filled; i++) sum += s.recent[i]!
  return tenths(sum / s.filled)
}

/** Starts the run's summary over. */
export const resetRunFrames = (s: FrameStats) => {
  s.hist.fill(0)
  s.frames = 0
  s.totalMs = 0
  s.long = 0
}

/** The run's frames: average and 95th percentile (ms, the p95 to the bucket's upper ms) and how many were long. */
export const runFrames = (s: FrameStats) => {
  if (s.frames === 0) return { avg: null, p95: null, long: 0 }
  const target = Math.ceil(s.frames * 0.95)
  let seen = 0
  let bucket = 0
  while (bucket < BUCKETS - 1 && (seen += s.hist[bucket]!) < target) bucket++
  return { avg: tenths(s.totalMs / s.frames), p95: bucket + 1, long: s.long }
}
