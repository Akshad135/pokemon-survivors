/**
 * Frame pacing for a fixed-step simulation. The browser's frame times jitter
 * by a fraction of a millisecond (timestamps are coarsened, vsync wobbles), and
 * with the step accumulator sitting right on a tick boundary (as it does after
 * every level-up or pause) that jitter alternates frames of 0 and 2 ticks: a
 * visible hitch at 60 Hz, constant judder at 120 Hz. Frame times close to a
 * whole share of the tick (120, 60 or 30 Hz) count as exactly that share, so
 * every frame runs the same number of ticks. What snapping takes off the wall
 * clock is kept in `drift` and paid back once it reaches half a tick, so the
 * simulation never runs ahead of real time (the ranking's clock check) nor falls
 * behind it.
 */
export type Pacer = { acc: number; drift: number }

/** Frame times, in ticks, that snap: 120 Hz, 60 Hz and 30 Hz displays. */
const SNAPS = [0.5, 1, 2] as const
/** How close (in ticks, ~0.5 ms at 60 Hz) a frame time must be to snap. */
const TOLERANCE = 0.03

export const pacer = (): Pacer => ({ acc: 0, drift: 0 })

/** Adds a frame of `dt` seconds to the accumulator, snapped to the display's cadence. */
export const advancePacer = (p: Pacer, dt: number, step: number) => {
  const ticks = dt / step
  const snap = SNAPS.find((s) => Math.abs(ticks - s) < TOLERANCE)
  if (snap === undefined) {
    p.acc += dt
    return
  }
  const paced = snap * step
  p.drift += dt - paced
  p.acc += paced
  if (Math.abs(p.drift) >= step / 2) {
    p.acc = Math.max(0, p.acc + p.drift)
    p.drift = 0
  }
}

/** Empties the accumulator while the simulation is stopped (menus, level-ups). */
export const resetPacer = (p: Pacer) => {
  p.acc = 0
  p.drift = 0
}
