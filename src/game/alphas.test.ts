import { describe, expect, it } from 'vitest'
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies'
import { RUN_LENGTH } from '../data/waves'
import { ALPHA, alphaCandidates, alphaHp, dashSpeed } from './alphas'
import { HORDE_GRIT, hordeGrit } from './horde'
import { hasTrait } from './roster'

const IDS = Object.keys(ENEMIES) as EnemyId[]
/** The first species of `tier`, with or without a behavior trait. */
const ofTier = (tier: number, trait: boolean) => IDS.find((id) => (ENEMIES[id] as EnemyDef).tier === tier && hasTrait(id) === trait)!

describe('alphaCandidates', () => {
  it("takes the stage's highest tier and leaves trait species out", () => {
    const pool = [[ofTier(1, false), 4], [ofTier(5, true), 1], [ofTier(4, false), 4], [ofTier(2, false), 3]] as const
    expect(alphaCandidates(pool)).toEqual([[ofTier(4, false), 4]])
  })

  it('is empty when only trait species are left', () => {
    expect(alphaCandidates([['voltorb', 4], ['chansey', 1]])).toEqual([])
    expect(hasTrait('voltorb') && hasTrait('chansey')).toBe(true)
  })
})

describe('alphaHp', () => {
  it('grows from its early multiplier to its late one over the ramp, and holds at both ends', () => {
    expect(alphaHp(0)).toBe(ALPHA.hp.early)
    expect(alphaHp(ALPHA.hp.ramp[1])).toBe(ALPHA.hp.late)
    expect(alphaHp(RUN_LENGTH * 2)).toBe(ALPHA.hp.late)
    expect(alphaHp((ALPHA.hp.ramp[0] + ALPHA.hp.ramp[1]) / 2)).toBe((ALPHA.hp.early + ALPHA.hp.late) / 2)
  })
})

describe('dashSpeed', () => {
  it('runs at three times the walk, within its bounds, faster enraged', () => {
    expect(dashSpeed(50, false)).toBe(150)
    expect(dashSpeed(10, false)).toBe(ALPHA.charge.min)
    expect(dashSpeed(200, false)).toBe(ALPHA.charge.max)
    expect(dashSpeed(50, true)).toBeCloseTo(150 * ALPHA.rage.speed)
  })
})

describe('hordeGrit', () => {
  it('grows from ×1 at the start to its peak at the end of the run, and holds there', () => {
    expect(hordeGrit(0, 'normal')).toBe(1)
    expect(hordeGrit(RUN_LENGTH, 'normal')).toBe(HORDE_GRIT.normal)
    expect(hordeGrit(RUN_LENGTH * 2, 'nightmare')).toBe(HORDE_GRIT.nightmare)
    expect(hordeGrit(RUN_LENGTH / 2, 'nightmare')).toBeGreaterThan(hordeGrit(RUN_LENGTH / 2, 'normal'))
  })
})
