import { describe, expect, it } from 'vitest'
import { createGovernor, observeFrame, type Governor } from './quality'

const frames = (gov: Governor, n: number, work: number, gap: number) => {
  for (let i = 0; i < n; i++) observeFrame(gov, work, gap)
  return gov.lean
}

describe('quality governor', () => {
  it('stays full through a lone hitch and goes lean when frames keep running long', () => {
    const gov = createGovernor(8)
    expect(frames(gov, 120, 4, 16.7)).toBe(false)
    observeFrame(gov, 40, 60)
    expect(frames(gov, 5, 4, 16.7)).toBe(false)
    expect(frames(gov, 40, 14, 16.7)).toBe(true)
  })

  it('counts missed vsyncs even when the JS is quick (a slow GPU)', () => {
    const gov = createGovernor(8)
    frames(gov, 60, 3, 16.7)
    expect(frames(gov, 40, 3, 33.4)).toBe(true)
  })

  it('brings full detail back after a calm stretch, and waits longer the next time', () => {
    const gov = createGovernor(8)
    frames(gov, 40, 14, 16.7)
    expect(frames(gov, 200, 3, 16.7)).toBe(true)
    expect(frames(gov, 300, 3, 16.7)).toBe(false)
    frames(gov, 40, 14, 16.7)
    expect(frames(gov, 400, 3, 16.7)).toBe(true)
    expect(frames(gov, 400, 3, 16.7)).toBe(false)
  })

  it('starts lean on a 2 GB phone and judges 4 GB ones by a tighter budget', () => {
    expect(createGovernor(2).lean).toBe(true)
    expect(frames(createGovernor(4), 40, 9, 16.7)).toBe(true)
    expect(frames(createGovernor(8), 40, 9, 16.7)).toBe(false)
  })
})
