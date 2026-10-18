import { describe, expect, it } from 'vitest'
import {
  avalancheMult, AVALANCHE_REVENGE, hammerSwing, heavyMult, HEAVY_MAX, isDownbeat, perishDamage, PERISH_BOSS, swipesFor, swipesNext,
} from './eggMove3Rules'
import { bonusApplies } from './kitRules'
import { createStatus } from './status'
import type { Enemy } from './types'

describe('Gigaton Hammer', () => {
  it('never slams twice in a row', () => {
    expect(hammerSwing(0)).toBe('slam')
    expect(hammerSwing(1)).toBe('tap')
  })
})

describe('Overdrive', () => {
  it('lands the downbeat on every fourth beat and on the last one', () => {
    expect([0, 1, 2, 3].map((i) => isDownbeat(i, 4))).toEqual([false, false, false, true])
    expect([0, 1, 2, 3, 4, 5].map((i) => isDownbeat(i, 6))).toEqual([false, false, false, true, false, true])
  })
})

describe('Fury Swipes', () => {
  it('goes from 2 to 5 swipes while the player stays in the brawl, and cools off away from it', () => {
    let stacks = 0
    const swipes: number[] = []
    for (let i = 0; i < 5; i++) {
      swipes.push(swipesFor(stacks))
      stacks = swipesNext(stacks, true)
    }
    expect(swipes).toEqual([2, 3, 4, 5, 5])
    expect(swipesNext(stacks, false)).toBe(0)
  })
})

describe('Heavy Slam', () => {
  it('weighs armor and max HP, up to its cap', () => {
    expect(heavyMult(0, 100)).toBe(1)
    expect(heavyMult(3, 100)).toBeCloseTo(1.36)
    expect(heavyMult(0, 200)).toBeCloseTo(1.5)
    expect(heavyMult(20, 400)).toBe(HEAVY_MAX)
  })
})

describe('Perish Song', () => {
  it('deals the whole blow to regular foes and a fixed share of a boss', () => {
    expect(perishDamage(80, 60, false)).toBe(80)
    expect(perishDamage(80, 5000, true)).toBe(5000 * PERISH_BOSS)
    expect(perishDamage(80, 100, true)).toBe(100 * PERISH_BOSS)
  })
})

describe('Avalanche', () => {
  it('pays back a hit taken since the last one', () => {
    expect(avalancheMult(0)).toBe(1)
    expect(avalancheMult(1)).toBe(AVALANCHE_REVENGE)
  })
})

describe('Frost Breath', () => {
  it('crits on chilled (slowed) and frozen foes only', () => {
    const foe = (status = createStatus()) => ({ status }) as Enemy
    const slowed = createStatus()
    slowed.slow.time = 1
    const frozen = createStatus()
    frozen.freeze.time = 1
    const burned = createStatus()
    burned.burn.time = 1
    expect(bonusApplies('chilled', foe(slowed))).toBe(true)
    expect(bonusApplies('chilled', foe(frozen))).toBe(true)
    expect(bonusApplies('chilled', foe(burned))).toBe(false)
    expect(bonusApplies('chilled', foe())).toBe(false)
  })
})
