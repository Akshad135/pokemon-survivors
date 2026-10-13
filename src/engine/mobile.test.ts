import { describe, expect, it } from 'vitest'
import { joystick, STICK_RADIUS } from './input'
import { deviceScale, fitView } from './viewport'

describe('joystick', () => {
  it('ignores jitter inside the dead zone', () => {
    expect(joystick({ x: 100, y: 100 }, { x: 104, y: 103 }).vec).toEqual({ x: 0, y: 0 })
  })

  it('ramps to full speed before the edge and drags the base past it', () => {
    const near = joystick({ x: 0, y: 0 }, { x: STICK_RADIUS * 0.8, y: 0 })
    expect(near.vec.x).toBeCloseTo(1)
    const far = joystick({ x: 0, y: 0 }, { x: STICK_RADIUS + 30, y: 0 })
    expect(far.origin).toEqual({ x: 30, y: 0 })
    expect(far.knob).toEqual({ x: STICK_RADIUS + 30, y: 0 })
    expect(Math.hypot(far.vec.x, far.vec.y)).toBeCloseTo(1)
  })
})

describe('viewport', () => {
  it('keeps the classic desktop view', () => {
    expect(fitView(1920, 1080, 1)).toEqual({ w: 480, h: 270, cssScale: 4 })
  })

  it('shows ~220 world px across a phone and stays integer in device px', () => {
    const portrait = fitView(390, 844, 3)
    expect(portrait.w).toBeGreaterThan(200)
    expect(portrait.w).toBeLessThan(260)
    expect(fitView(844, 390, 3).h).toBe(portrait.w)
    expect(Number.isInteger(deviceScale(412, 915, 2.625))).toBe(true)
  })
})
