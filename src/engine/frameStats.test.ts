import { describe, expect, it } from 'vitest'
import { frameStats, recentFrameMs, recordFrame, resetRunFrames, runFrames } from './frameStats'

describe('frameStats', () => {
  it("sums up a run's frames: average, p95 to the ms and the long ones", () => {
    const s = frameStats()
    for (let i = 0; i < 95; i++) recordFrame(s, 16.7, true)
    for (let i = 0; i < 5; i++) recordFrame(s, 80, true)
    expect(runFrames(s)).toEqual({ avg: 19.9, p95: 17, long: 5 })
    recordFrame(s, 200, true)
    expect(runFrames(s).p95).toBe(81)
  })

  it('leaves out background gaps, and frames outside play from the run', () => {
    const s = frameStats()
    recordFrame(s, 5000, true)
    recordFrame(s, 30, false)
    expect(runFrames(s)).toEqual({ avg: null, p95: null, long: 0 })
    expect(recentFrameMs(s)).toBe(30)
  })

  it('averages only the last couple of seconds, and starts a run over', () => {
    const s = frameStats()
    for (let i = 0; i < 500; i++) recordFrame(s, 40, true)
    for (let i = 0; i < 120; i++) recordFrame(s, 10, true)
    expect(recentFrameMs(s)).toBe(10)
    resetRunFrames(s)
    expect(runFrames(s).avg).toBeNull()
  })
})
