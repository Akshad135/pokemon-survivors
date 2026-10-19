import { describe, expect, it } from 'vitest'
import { TRAITS } from '../data/traits'
import { fanOffset, flavorOf, SPIT_FLAVORS, spitBand, spitterStride, volleySize } from './spitters'

describe('flavorOf', () => {
  it('follows the primary type, with the orb for types without their own spit', () => {
    expect(flavorOf(['fire', 'flying'])).toBe(SPIT_FLAVORS.fire)
    expect(flavorOf(['bug', 'poison'])).toBe(SPIT_FLAVORS.grass)
    expect(flavorOf(['flying', 'fire'])).toBe(SPIT_FLAVORS.orb)
  })

  it('keeps every shot slow enough to sidestep and the faster ones telegraphed longer', () => {
    for (const f of Object.values(SPIT_FLAVORS)) expect(f.speed / 68).toBeLessThan(2)
    expect(SPIT_FLAVORS.electric.charge).toBeGreaterThan(SPIT_FLAVORS.fire.charge)
  })
})

describe('spitter movement', () => {
  const band = { min: 110, max: 190 }

  it('walks in until in sight and in range, holds the band and backs off when crowded', () => {
    expect(spitterStride(150, false, band)).toBe(1)
    expect(spitterStride(250, true, band)).toBe(1)
    expect(spitterStride(150, true, band)).toBe(0)
    expect(spitterStride(60, true, band)).toBe(-TRAITS.spitter.back)
  })

  it('holds closer on a narrow portrait screen so it stays in view', () => {
    expect(spitBand({ w: 533, h: 300 }).min).toBe(TRAITS.spitter.min)
    expect(spitBand({ w: 150, h: 320 }).min).toBe(60)
  })
})

describe('volleys', () => {
  it('fires the flavor’s floor or the difficulty’s roll, whichever is more', () => {
    expect(volleySize(SPIT_FLAVORS.fire, [1, 1], 0.99)).toBe(1)
    expect(volleySize(SPIT_FLAVORS.fire, [2, 3], 0)).toBe(2)
    expect(volleySize(SPIT_FLAVORS.fire, [2, 3], 0.99)).toBe(3)
    expect(volleySize(SPIT_FLAVORS.grass, [1, 2], 0.99)).toBe(3)
  })

  it('fans shots symmetrically around the aim', () => {
    expect(fanOffset(0, 1, 0.3)).toBe(0)
    expect([0, 1, 2].map((i) => fanOffset(i, 3, 0.3))).toEqual([-0.3, 0, 0.3])
    expect(fanOffset(0, 2, 0.2) + fanOffset(1, 2, 0.2)).toBe(0)
  })
})
