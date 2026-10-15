import { describe, expect, it } from 'vitest'
import { createRng } from '../engine/rng'
import { rollShiny, SHINY_BUFF, SHINY_ODDS, shinyBoost, shinyStats } from './shiny'

describe('rollShiny', () => {
  it('hits close to the configured odds', () => {
    const rng = createRng(42)
    const rolls = 400_000
    let hits = 0
    for (let i = 0; i < rolls; i++) if (rollShiny(rng, SHINY_ODDS.enemy)) hits++
    expect(hits / rolls).toBeCloseTo(SHINY_ODDS.enemy, 3)
  })
})

describe('shinyBoost', () => {
  it('takes the wild odds from 1/450 to 1/225 over the Shiny Charm, and a Lure doubles them', () => {
    expect([0, 1, 2, 3].map((rank) => 1 / (SHINY_ODDS.enemy * shinyBoost(rank, false)))).toEqual([450, 337.5, 270, 225])
    expect(shinyBoost(3, true)).toBe(4)
  })
})

describe('shinyStats', () => {
  it('scales HP and EXP, and still rewards 0-EXP enemies', () => {
    expect(shinyStats({ maxHp: 10, xp: 2 })).toEqual({ hp: 10 * SHINY_BUFF.hp, xp: 2 * SHINY_BUFF.xp })
    expect(shinyStats({ maxHp: 10, xp: 0 }).xp).toBe(SHINY_BUFF.xp)
  })
})
