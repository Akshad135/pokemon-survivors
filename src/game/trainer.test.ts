import { describe, expect, it } from 'vitest'
import { EMPTY_SAVE, type Save } from './meta'
import { savedSupporterTier, trainerAvatar } from './trainer'

const supporter: Save = { ...EMPTY_SAVE, titles: ['supporter'] }

describe('trainerAvatar', () => {
  it('shows the partner at its final stage, shiny only when picked', () => {
    expect(trainerAvatar(EMPTY_SAVE, 'charmander')).toEqual({ dex: 6, shiny: false })
    expect(trainerAvatar({ ...EMPTY_SAVE, shinyStarters: { charmander: true } }, 'charmander')).toEqual({ dex: 6, shiny: true })
    expect(trainerAvatar({ ...EMPTY_SAVE, shinyStarters: { charmander: false } }, 'charmander')).toEqual({ dex: 6, shiny: false })
  })

  it("prefers a supporter's companion, if it can still walk along", () => {
    expect(trainerAvatar({ ...supporter, companion: { id: 'squirtle', shiny: false } }, 'charmander')).toEqual({ dex: 9, shiny: false })
    // Not a supporter (signed out of the thank-you), or a shiny not owned: back to the partner.
    expect(trainerAvatar({ ...EMPTY_SAVE, companion: { id: 'squirtle', shiny: false } }, 'charmander').dex).toBe(6)
    expect(trainerAvatar({ ...supporter, companion: { id: 'squirtle', shiny: true } }, 'charmander').dex).toBe(6)
  })
})

describe('savedSupporterTier', () => {
  it('reads the tier from the thank-you gifts', () => {
    expect(savedSupporterTier(EMPTY_SAVE)).toBeNull()
    expect(savedSupporterTier(supporter)).toBe('supporter')
    const gold = { ...supporter, style: { ...supporter.style, owned: { ...supporter.style.owned, background: ['supporter'] as const } } }
    expect(savedSupporterTier(gold)).toBe('gold')
  })
})
