import { describe, expect, it } from 'vitest'
import { parseAdminGift, parseAdminQuery } from '../../src/game/admin'
import { hasAdminEmail } from './admin'

describe('who is admin', () => {
  const allow = ['pedro@barretto.com.br']

  it('takes a verified email on the list, whatever its case', () => {
    expect(hasAdminEmail([{ address: 'other@x.com', verified: true }, { address: 'Pedro@Barretto.com.br', verified: true }], allow)).toBe(true)
  })

  it('never takes an unverified email, an empty list or someone else', () => {
    expect(hasAdminEmail([{ address: 'pedro@barretto.com.br', verified: false }], allow)).toBe(false)
    expect(hasAdminEmail([{ address: 'pedro@barretto.com.br', verified: true }], [])).toBe(false)
    expect(hasAdminEmail([{ address: 'pedro@barretto.com.br.evil.com', verified: true }], allow)).toBe(false)
    expect(hasAdminEmail([], allow)).toBe(false)
  })
})

describe('the desk', () => {
  it('reads an email or a handle from the search', () => {
    expect(parseAdminQuery(' Ash@Mail.com ')).toEqual({ by: 'email', text: 'ash@mail.com' })
    expect(parseAdminQuery('@Ash_K')).toEqual({ by: 'handle', text: 'ash_k' })
    expect(parseAdminQuery('ash')).toEqual({ by: 'handle', text: 'ash' })
    expect(parseAdminQuery('a')).toBeNull()
    expect(parseAdminQuery("ash'; drop")).toBeNull()
    expect(parseAdminQuery(undefined)).toBeNull()
  })

  it('sends any gift the game knows but a ribbon', () => {
    expect(parseAdminGift({ kind: 'egg', tier: 'rare' })).toEqual({ kind: 'egg', tier: 'rare' })
    expect(parseAdminGift({ kind: 'coins', amount: 500 })).toEqual({ kind: 'coins', amount: 500 })
    expect(parseAdminGift({ kind: 'ribbon', ribbon: { day: '2026-10-15', tier: 'gold', rank: 1, total: 10 } })).toBeNull()
    expect(parseAdminGift({ kind: 'egg', tier: 'legendary-ish' })).toBeNull()
  })
})
