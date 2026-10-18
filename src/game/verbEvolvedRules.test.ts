import { describe, expect, it } from 'vitest'
import { chainKids, cycle, driftLinks, driftRadius, leadOf, segmentDistance, spoutMult, SPOUT_MULT, toughest, zigzagLegs } from './verbEvolvedRules'

const foe = (id: number, x: number, y: number, extra: { hp?: number; boss?: boolean; dying?: number } = {}) =>
  ({ id, x, y, dying: extra.dying ?? -1, hp: extra.hp ?? 10, boss: extra.boss ?? false })

describe('Water Spout', () => {
  it('rains harder the fuller the HP, within its bounds', () => {
    expect(spoutMult(0)).toBe(SPOUT_MULT.empty)
    expect(spoutMult(1)).toBe(SPOUT_MULT.full)
    expect(spoutMult(2)).toBe(SPOUT_MULT.full)
    expect(spoutMult(0.5)).toBeGreaterThan(spoutMult(0.25))
  })
})

describe('Electro Drift', () => {
  it('spirals out from its start to its end radius', () => {
    expect(driftRadius(0, 14, 96)).toBe(14)
    expect(driftRadius(1, 14, 96)).toBe(96)
    expect(driftRadius(0.5, 14, 96)).toBeGreaterThan(55)
  })

  it('links two orbs once and three or more in a loop', () => {
    expect(driftLinks(1)).toEqual([])
    expect(driftLinks(2)).toEqual([[0, 1]])
    expect(driftLinks(3)).toEqual([[0, 1], [1, 2], [2, 0]])
  })

  it('measures the distance to the lightning, clamped to its ends', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 10, y: 0 }
    expect(segmentDistance({ x: 5, y: 3 }, a, b)).toBe(3)
    expect(segmentDistance({ x: 13, y: 4 }, a, b)).toBe(5)
    expect(segmentDistance({ x: 3, y: 4 }, a, a)).toBe(5)
  })
})

describe('Sky Uppercut', () => {
  it('goes for bosses first, then the most HP left, skipping fainted foes', () => {
    const foes = [foe(1, 0, 0, { hp: 50 }), foe(2, 0, 0, { hp: 80 }), foe(3, 0, 0, { hp: 20, boss: true }), foe(4, 0, 0, { hp: 999, dying: 0 })]
    expect(toughest(foes, 2).map((e) => e.id)).toEqual([3, 2])
  })
})

describe('First Impression', () => {
  const o = { length: 50, seek: 20, overshoot: 10, facing: { x: 1, y: 0 } }

  it('zigzags through the nearest foe not hit yet, from where each leg ended', () => {
    const legs = zigzagLegs({ x: 0, y: 0 }, [foe(1, 30, 0), foe(2, 30, 30), foe(3, -200, 0)], 3, o)
    expect(legs).toHaveLength(2)
    expect(legs[0]!.to).toEqual({ x: 40, y: 0 })
    expect(legs[1]!.from).toEqual({ x: 40, y: 0 })
    expect(legs[1]!.to.y).toBeGreaterThan(30)
  })

  it('never runs a leg longer than its length, and dashes ahead with nobody in reach', () => {
    expect(zigzagLegs({ x: 0, y: 0 }, [foe(1, 65, 0)], 1, o)[0]!.to).toEqual({ x: 50, y: 0 })
    expect(zigzagLegs({ x: 0, y: 0 }, [foe(1, 500, 0)], 3, o)).toEqual([{ from: { x: 0, y: 0 }, to: { x: 50, y: 0 } }])
  })
})

describe('Thousand Arrows and Explosion', () => {
  it('cycles targets when there are fewer foes than arrows', () => {
    expect(cycle(['a', 'b'], 5)).toEqual(['a', 'b', 'a', 'b', 'a'])
    expect(cycle([], 3)).toEqual([])
  })

  it('lets the chain spread a little less at each step, then stop', () => {
    expect([0, 1, 2, 3].map(chainKids)).toEqual([10, 2, 1, 0])
  })
})

describe('lobs', () => {
  it('aim where a chasing foe will be, never on top of the player', () => {
    expect(leadOf({ x: 100, y: 0, speed: 50 }, { x: 0, y: 0 }, 1)).toEqual({ x: 50, y: 0 })
    expect(leadOf({ x: 30, y: 0, speed: 200 }, { x: 0, y: 0 }, 1)).toEqual({ x: 12, y: 0 })
    expect(leadOf({ x: 5, y: 0, speed: 200 }, { x: 0, y: 0 }, 1)).toEqual({ x: 5, y: 0 })
  })
})
