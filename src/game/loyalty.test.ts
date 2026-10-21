import { describe, expect, it } from 'vitest'
import { applyGift, keepGiven } from './gifts'
import { gameGiftsApplied, isGameGift } from './gameGifts'
import { hasStatue, loyaltyGiftId, milestoneState, nextMilestone, reachedNow, shopGifts, tycoonGiftId } from './loyalty'
import { EMPTY_SAVE, type Save } from './meta'
import { NO_SHOP } from './shop'
import { stallOn } from './stalls'
import { LOYALTY } from '../data/visitors'

const withStamps = (stamps: number, level: Save['shop']['level'] = 1): Save => ({ ...EMPTY_SAVE, shop: { ...NO_SHOP, level, stamps } })

/** Opens every waiting shop gift, as the lobby's gift box does. */
const openAll = (save: Save) => shopGifts(save).reduce((s, g) => {
  const out = applyGift(s, g)
  return out.status === 'applied' ? out.save : s
}, save)

describe('the loyalty card', () => {
  it('finds the next milestone and the ones a visit just reached', () => {
    expect(nextMilestone(0)?.stamps).toBe(7)
    expect(nextMilestone(7)?.stamps).toBe(14)
    expect(nextMilestone(100)).toBeNull()
    expect(reachedNow(6, 7).map((m) => m.stamps)).toEqual([7])
    expect(reachedNow(7, 7)).toEqual([])
  })

  it('pays its gift milestones once each, through the gift box', () => {
    expect(shopGifts(withStamps(6))).toEqual([])
    expect(shopGifts(withStamps(30)).map((g) => g.id)).toEqual([7, 14, 30].map(loyaltyGiftId))
    const opened = openAll(withStamps(30))
    expect(opened.titles).toContain('vipCustomer')
    expect(opened.style.owned.frame).toContain('regular')
    expect(opened.eggs.map((e) => e.tier)).toEqual(['rare'])
    expect(shopGifts(opened)).toEqual([])
    const [egg, frame, title, statue, mystery] = LOYALTY.milestones
    expect([egg, frame, title].map((m) => milestoneState(opened, m))).toEqual(['claimed', 'claimed', 'claimed'])
    expect(milestoneState(withStamps(30), egg)).toBe('waiting')
    expect([statue, mystery].map((m) => milestoneState(opened, m))).toEqual(['ahead', 'ahead'])
  })

  it('raises the golden statue at 60 stamps or with the Department Store', () => {
    expect(hasStatue(withStamps(59, 4))).toBe(false)
    expect(hasStatue(withStamps(60))).toBe(true)
    expect(hasStatue(withStamps(0, 5))).toBe(true)
  })
})

describe('the Department Store', () => {
  it('pays the Tycoon title and the gold Kecleon frame', () => {
    expect(shopGifts(withStamps(0, 4))).toEqual([])
    expect(shopGifts(withStamps(0, 5)).map((g) => g.id)).toEqual([tycoonGiftId(0), tycoonGiftId(1)])
    const opened = openAll(withStamps(0, 5))
    expect(opened.title).toBe('tycoon')
    expect(opened.titles).toContain('tycoon')
    expect(opened.style.equipped.frame).toBe('kecleon')
  })
})

describe('the game’s own gifts on the API', () => {
  it('keeps what the shop gave, and drops the same reward without its gift', () => {
    const opened = openAll(withStamps(30, 5))
    expect(shopGifts(opened)).toEqual([])
    expect(opened.gifts.every(isGameGift)).toBe(true)
    expect(keepGiven(opened, gameGiftsApplied(opened))).toEqual(opened)
    const edited: Save = { ...opened, gifts: [] }
    expect(keepGiven(edited, gameGiftsApplied(edited)).titles).toEqual([])
  })
})

describe('seasonal stalls', () => {
  it('stand on their event days only', () => {
    expect(stallOn('2026-10-23')).toBeNull()
    expect(stallOn('2026-10-24')).toBe('halloween')
    expect(stallOn('2026-11-02')).toBe('halloween')
    expect(stallOn('2026-11-03')).toBeNull()
    expect(stallOn('2026-12-15')).toBe('christmas')
    expect(stallOn('2026-12-31')).toBe('christmas')
    expect(stallOn('2027-01-01')).toBeNull()
  })
})
