import { describe, expect, it } from 'vitest'
import { armored } from './combat'
import { createTension, edgeDistance, harmAfter, reachAfter, TENSION, TENSION_PEAK, tensionAfter, tensionCeiling, tensionMods } from './tension'

/** Runs `tensionAfter` for `seconds` at 60 Hz with a fixed reach, harm and HP share. */
const hold = (level: number, reach: number, seconds: number, harm = 0, hp = 1) => {
  let s = { level, reach, harm }
  for (let i = 0; i < seconds * 60; i++) s = { ...s, level: tensionAfter(s, hp, 1 / 60) }
  return s.level
}

describe('tension', () => {
  it('climbs over tens of seconds while nothing hurts, twice as fast when the horde dies at the screen edge', () => {
    expect(hold(0, 1, 10)).toBeLessThan(0.3)
    expect(hold(0, 1, TENSION.rise + 1)).toBe(1)
    expect(hold(0, TENSION.calm, TENSION.rise)).toBeCloseTo(0.5)
  })

  it('stays out of the early game: none before it starts, all of it only from the late game', () => {
    expect(tensionCeiling(TENSION.from)).toBe(0)
    expect(tensionCeiling((TENSION.from + TENSION.full) / 2)).toBeCloseTo(0.5)
    expect(tensionCeiling(TENSION.full + 60)).toBe(1)
  })

  it('falls when the horde dies at the player\'s feet, faster when the player is hurting or low', () => {
    expect(hold(1, TENSION.crowded - 0.1, 10)).toBeLessThan(1)
    expect(hold(1, 1, TENSION.fall + 1, TENSION.hurting * 2)).toBe(0)
    expect(hold(1, 1, TENSION.fall + 1, 0, TENSION.lowHp - 0.1)).toBe(0)
  })

  it('reach follows where regulars die, and a kill far off screen counts as only a little past the edge', () => {
    let reach = createTension().reach
    for (let i = 0; i < 300; i++) reach = reachAfter(reach, 0.9)
    expect(reach).toBeCloseTo(0.9, 2)
    expect(reachAfter(0.5, 50)).toBeCloseTo(reachAfter(0.5, 1.5))
  })

  it('harm adds a hit as a share of max HP and fades', () => {
    const hit = harmAfter(0, 0.3, 1 / 60)
    expect(hit).toBeGreaterThan(TENSION.hurting)
    let h = hit
    for (let i = 0; i < 60 * 30; i++) h = harmAfter(h, 0, 1 / 60)
    expect(h).toBeLessThan(TENSION.hurting / 10)
  })

  it('does nothing at 0 and reaches each difficulty\'s peak at 1; endless keeps the cap', () => {
    for (const peak of Object.values(TENSION_PEAK)) {
      expect(tensionMods(0, peak, false)).toEqual({ rate: 1, cap: 1, near: 0, speed: 1, elite: 0 })
      expect(tensionMods(1, peak, false)).toEqual({ rate: peak.rate, cap: peak.cap, near: peak.near, speed: peak.speed, elite: peak.elite })
      expect(tensionMods(1, peak, true).cap).toBe(1)
    }
    expect(TENSION_PEAK.normal.rate).toBeLessThan(TENSION_PEAK.hard.rate)
    expect(TENSION_PEAK.hard.rate).toBeLessThan(TENSION_PEAK.nightmare.rate)
  })

  it('measures the screen edge along a direction', () => {
    const view = { w: 480, h: 270 }
    expect(edgeDistance(view, 1, 0)).toBe(240)
    expect(edgeDistance(view, 0, -1)).toBe(135)
    expect(edgeDistance(view, Math.SQRT1_2, Math.SQRT1_2)).toBeCloseTo(135 * Math.SQRT2)
  })
})

describe('armor', () => {
  it('takes a point off per point, but never more than half a hit', () => {
    expect(armored(40, 6)).toBe(34)
    expect(armored(10, 8)).toBe(5)
    expect(armored(2, 8)).toBe(1)
    expect(armored(10, -1)).toBe(11)
  })
})
