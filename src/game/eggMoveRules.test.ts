import { describe, expect, it } from 'vitest'
import {
  biggestFoe, boneHits, curseCost, curseTick, CURSE_HP_CAP, densestFoe, echoMult, flailExtra, flailMult, foulMult, FOUL_MAX,
  FOUL_MIN, furyNext, FURY_MAX, mashMult, MASH_MAX, metronomePick, rampDamage, rampFull, RAMP_MAX, splitDarts, strongestFirst,
} from './eggMoveRules'

const foe = (id: number, x: number, y: number, o: { boss?: boolean; maxHp?: number; dying?: number } = {}) => ({
  id, x, y, boss: o.boss ?? false, maxHp: o.maxHp ?? 10, dying: o.dying ?? -1,
})

describe('Dragon Darts split', () => {
  it('sends one dart each while there are enough foes, doubling up on the nearest otherwise', () => {
    expect(splitDarts(2, 1)).toEqual([2])
    expect(splitDarts(2, 2)).toEqual([1, 1])
    expect(splitDarts(2, 5)).toEqual([1, 1])
    expect(splitDarts(5, 3)).toEqual([2, 2, 1])
    expect(splitDarts(2, 0)).toEqual([])
  })
})

describe('Dig and Curse targets', () => {
  it('Dig comes up under a boss first, then the biggest, then the nearest', () => {
    const foes = [foe(1, 10, 0, { maxHp: 50 }), foe(2, 30, 0, { maxHp: 80 }), foe(3, 100, 0, { boss: true, maxHp: 40 }), foe(4, 400, 0, { boss: true })]
    expect(biggestFoe(foes, { x: 0, y: 0 }, 160)?.id).toBe(3)
    expect(biggestFoe(foes.slice(0, 2), { x: 0, y: 0 }, 160)?.id).toBe(2)
    expect(biggestFoe([foe(5, 20, 0), foe(6, 10, 0)], { x: 0, y: 0 }, 160)?.id).toBe(6)
    expect(biggestFoe([foe(7, 10, 0, { dying: 0 })], { x: 0, y: 0 }, 160)).toBeNull()
  })

  it('Curse goes for bosses, then the most max HP', () => {
    const order = [foe(1, 0, 0, { maxHp: 30 }), foe(2, 0, 0, { boss: true, maxHp: 20 }), foe(3, 0, 0, { maxHp: 90 })].sort(strongestFirst)
    expect(order.map((e) => e.id)).toEqual([2, 3, 1])
  })
})

describe('Body Slam lands on the thickest crowd', () => {
  it('picks the foe with the most neighbors, the nearest on a tie', () => {
    const crowd = [foe(1, 20, 0), foe(2, 90, 0), foe(3, 100, 0), foe(4, 95, 10)]
    expect(densestFoe(crowd, { x: 0, y: 0 }, 120, 34)?.id).toBe(2)
    expect(densestFoe([foe(5, 50, 0), foe(6, 30, 0)], { x: 0, y: 0 }, 120, 10)?.id).toBe(6)
  })
})

describe('ramps', () => {
  it('Rollout and Ice Ball double each hit up to ×5', () => {
    let d = 10
    const seen = []
    for (let i = 0; i < 5; i++) seen.push((d = rampDamage(d, 10)))
    expect(seen).toEqual([20, 40, 50, 50, 50])
    expect(rampFull(50, 10)).toBe(true)
    expect(rampFull(40, 10)).toBe(false)
    expect(RAMP_MAX).toBe(5)
  })

  it('Fury Cutter grows on a hit up to ×4 and starts over on a miss', () => {
    expect(furyNext(0, true)).toBe(1)
    expect(furyNext(FURY_MAX, true)).toBe(FURY_MAX)
    expect(furyNext(2, false)).toBe(0)
  })

  it('Meteor Mash and Echoed Voice cap their stacks', () => {
    expect(mashMult(0)).toBe(1)
    expect(mashMult(MASH_MAX + 5)).toBe(mashMult(MASH_MAX))
    expect(echoMult(99)).toBe(echoMult(5))
  })
})

describe('Foul Play uses the target strength', () => {
  it('scales with contact damage within its bounds', () => {
    expect(foulMult(1)).toBe(FOUL_MIN)
    expect(foulMult(18)).toBe(2)
    expect(foulMult(300)).toBe(FOUL_MAX)
  })
})

describe('Flail', () => {
  it('hits harder and more often the lower the HP', () => {
    expect(flailMult(1)).toBe(1)
    expect(flailMult(0.2)).toBe(3)
    expect(flailMult(0)).toBe(3)
    expect([flailExtra(1), flailExtra(0.5), flailExtra(0.1), flailExtra(0)]).toEqual([0, 1, 2, 2])
  })
})

describe('Bone Rush', () => {
  it('hits 2 to 5 times like the games', () => {
    expect([0, 0.34, 0.35, 0.69, 0.7, 0.84, 0.85, 0.999].map(boneHits)).toEqual([2, 2, 3, 3, 4, 4, 5, 5])
  })
})

describe('Metronome', () => {
  it('reaches for an evolved move only on a low roll', () => {
    expect(metronomePick(0.1, 0, ['a', 'b'], ['X'])).toBe('X')
    expect(metronomePick(0.9, 0.99, ['a', 'b'], ['X'])).toBe('b')
  })
})

describe('Curse', () => {
  it('costs 15% of current HP and never the last point', () => {
    expect(curseCost(100)).toBe(15)
    expect(curseCost(1)).toBe(0)
    expect(curseCost(3)).toBe(0)
  })

  it('ticks a share of max HP, counting no more than the cap', () => {
    expect(curseTick(1000, 1.2, 0.5)).toBeCloseTo(6)
    expect(curseTick(300000, 1, 1)).toBe(CURSE_HP_CAP / 100)
  })
})
