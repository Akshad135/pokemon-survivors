import { describe, expect, it } from 'vitest'
import { firstTouch, landingRef } from './referral'

describe('landingRef', () => {
  it('reads ?ref= first, then the profile link, and drops invalid handles', () => {
    expect(landingRef(new URLSearchParams('ref=Ash_K&u=misty'), 'u')).toBe('ash_k')
    expect(landingRef(new URLSearchParams('u=misty'), 'u')).toBe('misty')
    expect(landingRef(new URLSearchParams('ref=a!&u=x'), 'u')).toBeNull()
  })
})

describe('firstTouch', () => {
  it('keeps the first handle seen and never the player’s own', () => {
    expect(firstTouch(null, 'misty', null)).toBe('misty')
    expect(firstTouch('ash', 'misty', null)).toBe('ash')
    expect(firstTouch(null, 'misty', 'misty')).toBeNull()
    expect(firstTouch(null, null, 'ash')).toBeNull()
  })
})
