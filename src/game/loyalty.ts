import { LOYALTY, TYCOON_REWARDS, type LoyaltyReward } from '../data/visitors'
import { SHOP_LEVELS } from '../data/shop'
import type { Gift, GiftContent } from './gifts'
import type { Save } from './meta'

/**
 * The Kecleon Shop's loyalty card and the Department Store's rewards. The
 * stamps live in the save's `shop.stamps` (one per Brasília day with a visit,
 * `recordVisit`). The milestones that pay a Mystery Gift (the rare egg, the
 * Freguês frame, the VIP title) and the Department Store's Tycoon title and
 * gold Kecleon frame are gifts the game makes itself, like the Noite das
 * Bruxas candy jar's: they wait in the lobby's gift box, and the save keeps
 * their ids once opened (`gifts`, a union on sync), so each lands once on any
 * device. The 60-stamp milestone raises the golden statue on the plaza (as
 * the Department Store does); the 100-stamp one is a mystery for now. Pure.
 */

export type Milestone = (typeof LOYALTY.milestones)[number]

/** The Mystery Gift id of a milestone's reward. */
export const loyaltyGiftId = (stamps: number) => `loyalty:${stamps}`

/** The Mystery Gift id of a Department Store reward. */
export const tycoonGiftId = (index: number) => `shop:tycoon${index}`

/** Whether a milestone's reward is a gift (not the statue or the mystery). */
export const isGiftReward = (r: LoyaltyReward): r is GiftContent => typeof r !== 'string'

/** The next milestone past `stamps`, or null past the last. */
export const nextMilestone = (stamps: number): Milestone | null => LOYALTY.milestones.find((m) => m.stamps > stamps) ?? null

/** Milestones reached at `stamps` but not at `before`: the ones a visit just reached. */
export const reachedNow = (before: number, stamps: number): Milestone[] => LOYALTY.milestones.filter((m) => m.stamps > before && m.stamps <= stamps)

/** Whether the golden Kecleon statue stands on the plaza: the Department Store, or 60 stamps. */
export const hasStatue = (save: Save) => SHOP_LEVELS[save.shop.level].tycoon || LOYALTY.milestones.some((m) => m.reward === 'statue' && save.shop.stamps >= m.stamps)

/** Every gift the loyalty card and the Department Store can make, with their ids. */
export const shopGiftList = (): readonly { id: string; content: GiftContent; earned: (save: Save) => boolean; reason: Gift['reason'] }[] => [
  ...LOYALTY.milestones.flatMap((m) =>
    isGiftReward(m.reward) ? [{ id: loyaltyGiftId(m.stamps), content: m.reward, earned: (s: Save) => s.shop.stamps >= m.stamps, reason: { kind: 'loyalty', stamps: m.stamps } as const }] : [],
  ),
  ...TYCOON_REWARDS.map((content, i) => ({ id: tycoonGiftId(i), content, earned: (s: Save) => SHOP_LEVELS[s.shop.level].tycoon, reason: { kind: 'tycoon' } as const })),
]

/** The shop's gifts waiting to be opened: every one the save earned and didn't apply yet. */
export const shopGifts = (save: Save): Gift[] =>
  shopGiftList().flatMap((g) => (g.earned(save) && !save.gifts.includes(g.id) ? [{ id: g.id, content: g.content, reason: g.reason }] : []))

/** Where a milestone stands for a save: opened, waiting in the gift box, a place reward already standing, or still ahead. */
export const milestoneState = (save: Save, m: Milestone): 'claimed' | 'waiting' | 'done' | 'ahead' => {
  if (save.shop.stamps < m.stamps) return 'ahead'
  if (!isGiftReward(m.reward)) return 'done'
  return save.gifts.includes(loyaltyGiftId(m.stamps)) ? 'claimed' : 'waiting'
}
