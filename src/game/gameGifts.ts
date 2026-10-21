import { CARAVAN } from '../data/visitors'
import { CARAVAN_FRAME_ID } from './caravan'
import type { DayKey } from './day'
import type { Gift, GiftContent } from './gifts'
import { HALLOWEEN_REWARDS, halloweenGiftId, halloweenGifts, HUNT_REWARDS, huntGiftId, PUMPKABOO_GIFT } from './halloween'
import { shopGiftList, shopGifts } from './loyalty'
import type { Save } from './meta'

/**
 * Gifts the game makes itself, for guests too, worked out from the save so
 * they never touch the API: the Noite das Bruxas candy jar's and Caça aos
 * Fantasmas' rewards, and the Kecleon Shop's loyalty card and Department
 * Store rewards. Their ids are the game's own (`isGameGift`), never claimed
 * in the API. Pure; shared with the API.
 */

/** The game's gifts waiting to be opened on `day`. */
export const gameGifts = (save: Save, day: DayKey): Gift[] => [...halloweenGifts(save, day), ...shopGifts(save)]

/** Whether a gift id is one of the game's own (not the API's to claim). */
export const isGameGift = (id: string) => id.startsWith('halloween2026:') || id.startsWith('loyalty:') || id.startsWith('shop:')

/** Every id the game gives (or vouches for) and what it brought. */
const GAME_GIFT_CONTENTS = (): ReadonlyMap<string, GiftContent> =>
  new Map<string, GiftContent>([
    ...HALLOWEEN_REWARDS.map((r, i) => [halloweenGiftId(i), r.content] as const),
    ...HUNT_REWARDS.map((c, i) => [huntGiftId(i), c] as const),
    [PUMPKABOO_GIFT.id, PUMPKABOO_GIFT.content],
    ...shopGiftList().map((g) => [g.id, g.content] as const),
    // Not a gift: the id a caravan purchase leaves to vouch for Meowth's frame, which the style shelf never sells.
    [CARAVAN_FRAME_ID, { kind: 'style', style: { slot: 'frame', id: CARAVAN.frame.id } }],
  ])

/**
 * The game-made gifts the save applied (their ids are in its `gifts`), as
 * `keepGiven` takes them: the API runs `keepGiven` with these besides the
 * player's own gifts, so a title or a frame the game gave (the Pumpkin King,
 * the VIP Customer, the Tycoon, Meowth's frame…) isn't taken for an edit.
 * These rewards follow progress the device reports (candies, stamps, the
 * shop's level), which the API trusts the same way.
 */
export const gameGiftsApplied = (save: Save): Pick<Gift, 'id' | 'content'>[] => {
  const contents = GAME_GIFT_CONTENTS()
  return save.gifts.flatMap((id) => {
    const content = contents.get(id)
    return content ? [{ id, content }] : []
  })
}
