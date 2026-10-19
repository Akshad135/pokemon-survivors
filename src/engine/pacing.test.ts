import { describe, expect, it } from 'vitest'
import { advancePacer, pacer, type Pacer } from './pacing'

const STEP = 1 / 60

/** Ticks each frame runs for a display at `hz`, timestamps coarsened to 0.1 ms like the browser's. */
const ticksPerFrame = (hz: number, frames: number, start = 1000) => {
  const p: Pacer = pacer()
  const stamp = (k: number) => Math.floor((start + (k * 1000) / hz) * 10) / 10
  const out: number[] = []
  for (let k = 1; k <= frames; k++) {
    advancePacer(p, (stamp(k) - stamp(k - 1)) / 1000, STEP)
    let n = 0
    while (p.acc >= STEP) {
      p.acc -= STEP
      n++
    }
    out.push(n)
  }
  return out
}

describe('advancePacer', () => {
  it('runs one tick every frame at 60 Hz, right from an empty accumulator', () => {
    for (const start of [1000, 1000.04, 1234.56]) expect(new Set(ticksPerFrame(60, 600, start))).toEqual(new Set([1]))
  })

  it('runs a tick every other frame at 120 Hz, never two frames in a row', () => {
    const ticks = ticksPerFrame(120, 1200).join('')
    expect(ticks).not.toMatch(/11|00|2/)
  })

  it('keeps the simulation within half a tick of the wall clock', () => {
    // A display a little off 60 Hz snaps every frame, and the drift is paid back.
    for (const hz of [59.94, 60.2, 120.3]) {
      const frames = Math.round(hz * 60)
      const ticks = ticksPerFrame(hz, frames).reduce((a, b) => a + b, 0)
      expect(Math.abs(ticks * STEP - frames / hz)).toBeLessThanOrEqual(STEP)
    }
  })

  it('leaves frame times off the usual cadences alone', () => {
    const ticks = ticksPerFrame(144, 144 * 10).reduce((a, b) => a + b, 0)
    expect(Math.abs(ticks - 600)).toBeLessThanOrEqual(1)
  })
})
