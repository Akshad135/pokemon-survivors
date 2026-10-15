import { describe, expect, it } from 'vitest'
import { canRefer, creditDue, firstTouch, landingRef, milestoneGifts, REFERRAL } from './referral'

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

describe('canRefer', () => {
  const signUp = { userId: 'new', referrer: 'ash', ageHours: 1, hasSave: false, referredBy: null }

  it('credits a new account once, never oneself', () => {
    expect(canRefer(signUp)).toBe(true)
    expect(canRefer({ ...signUp, referrer: 'new' })).toBe(false)
    expect(canRefer({ ...signUp, referrer: null })).toBe(false)
    expect(canRefer({ ...signUp, referredBy: 'misty' })).toBe(false)
  })

  it('refuses accounts that already played or are old', () => {
    expect(canRefer({ ...signUp, hasSave: true })).toBe(false)
    expect(canRefer({ ...signUp, ageHours: REFERRAL.newAccountHours + 1 })).toBe(false)
  })
})

describe('invite rewards', () => {
  it('count once the friend has enough verified runs', () => {
    expect(creditDue(REFERRAL.verifiedRuns - 1, false)).toBe(false)
    expect(creditDue(REFERRAL.verifiedRuns, false)).toBe(true)
    expect(creditDue(REFERRAL.verifiedRuns + 5, true)).toBe(false)
  })

  it('pay at 1, 3 and 10 friends', () => {
    expect(milestoneGifts(1)).toEqual([{ kind: 'egg', tier: 'friend' }])
    expect(milestoneGifts(2)).toEqual([])
    expect(milestoneGifts(3).map((g) => g.kind)).toEqual(['title', 'style'])
    expect(milestoneGifts(10)).toEqual([{ kind: 'shinyHatch', family: 'munchlax' }])
  })
})
