import { describe, expect, it } from 'vitest'
import { SUPPORTER } from '../data/supporters'
import { EMPTY_SAVE } from './meta'
import { canWalkWith, donationPoints, newCode, parseCode, supporterTier, tiersReached } from './supporters'

describe('supporter tiers', () => {
  it('counts reais and dollars on one scale', () => {
    expect(donationPoints(1000, 'BRL')).toBe(1000)
    expect(donationPoints(200, 'usd')).toBe(1000)
    // Another currency Stripe charged in counts as dollars.
    expect(donationPoints(200, 'eur')).toBe(1000)
  })

  it('makes any donation a supporter and the total a gold one', () => {
    expect(supporterTier(0)).toBeNull()
    expect(supporterTier(500)).toBe('supporter')
    expect(supporterTier(SUPPORTER.gold)).toBe('gold')
  })

  it('reaches each tier once, both at once for a big first donation', () => {
    expect(tiersReached(0, 500)).toEqual(['supporter'])
    expect(tiersReached(0, SUPPORTER.gold)).toEqual(['supporter', 'gold'])
    expect(tiersReached(4000, 6000)).toEqual(['gold'])
    expect(tiersReached(6000, 9000)).toEqual([])
  })
})

describe('codes', () => {
  it('reads a code however it was typed', () => {
    const code = newCode((b) => b.fill(7))
    expect(code).toMatch(/^PS-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(parseCode(code.toLowerCase().replace(/-/g, ' '))).toBe(code)
    expect(parseCode(code.slice(3))).toBe(code)
  })

  it('refuses what cannot be a code', () => {
    expect(parseCode('PS-ABCD-EFG')).toBeNull()
    // 0, 1, I, L and O aren't in the alphabet.
    expect(parseCode('PS-ABCD-EFG0')).toBeNull()
    expect(parseCode(42)).toBeNull()
  })
})

describe('canWalkWith', () => {
  it('takes any starter, a family only once hatched, and a shiny only if owned', () => {
    expect(canWalkWith(EMPTY_SAVE, { id: 'charmander', shiny: false })).toBe(true)
    expect(canWalkWith(EMPTY_SAVE, { id: 'charmander', shiny: true })).toBe(false)
    expect(canWalkWith(EMPTY_SAVE, { id: 'gible', shiny: false })).toBe(false)
    const hatched = { ...EMPTY_SAVE, hatched: { gible: { shiny: true } } }
    expect(canWalkWith(hatched, { id: 'gible', shiny: true })).toBe(true)
  })
})
