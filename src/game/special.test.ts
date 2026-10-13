import { describe, expect, it } from 'vitest'
import { createSpecialState, MIN_SPECIAL_COOLDOWN, resolveSpecial, SPECIALS, specialCooldown, specialIdFor, triggerSpecial } from './special'
import { BASE_STATS } from './stats'

const DT = 1 / 60

describe('special trigger', () => {
  it('fires on a press when ready, never while on cooldown or busy', () => {
    const s = createSpecialState()
    expect(triggerSpecial(s, true, DT)).toBe(true)
    s.cooldown = 5
    expect(triggerSpecial(s, true, DT)).toBe(false)
    s.cooldown = 0
    s.charge = 0.3
    expect(triggerSpecial(s, true, DT)).toBe(false)
  })

  it('buffers an early press until the cooldown runs out, then drops it', () => {
    const s = { ...createSpecialState(), cooldown: 0.1 }
    expect(triggerSpecial(s, true, DT)).toBe(false)
    let fired = 0
    for (let i = 0; i < 10; i++) fired += Number(triggerSpecial(s, false, DT))
    expect(fired).toBe(1)

    const late = { ...createSpecialState(), cooldown: 1 }
    triggerSpecial(late, true, DT)
    for (let i = 0; i < 90; i++) expect(triggerSpecial(late, false, DT)).toBe(false)
  })

  it('scales the cooldown with the cooldown stat, down to a floor', () => {
    const def = SPECIALS.blastBurn
    expect(specialCooldown(def, { ...BASE_STATS, cooldown: 0.8 })).toBeCloseTo(def.cooldown * 0.8)
    expect(specialCooldown(def, { ...BASE_STATS, cooldown: 0.1 })).toBe(MIN_SPECIAL_COOLDOWN)
  })
})

describe('special resolution', () => {
  it('picks by type, falling back to later types and then the generic special', () => {
    expect(specialIdFor('bulbasaur', ['grass', 'poison'])).toBe('frenzyPlant')
    expect(specialIdFor('bulbasaur', ['poison', 'water'])).toBe('hydroCannon')
    expect(specialIdFor('bulbasaur', ['electric'])).toBe('boomburst')
  })

  it('upgrades to the signature hyper move at the final stage', () => {
    expect(resolveSpecial('charmander', 0).tier.name).toBe('Flare Blitz')
    expect(resolveSpecial('charmander', 2).tier.name).toBe('Blast Burn')
    expect(resolveSpecial('squirtle', 2).tier.name).toBe('Hydro Cannon')
    expect(resolveSpecial('bulbasaur', 2).tier.name).toBe('Frenzy Plant')
  })
})
