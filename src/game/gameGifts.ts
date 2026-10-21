import type { Gift } from './gifts'
import { HALLOWEEN_REWARDS, halloweenGiftId, HUNT_REWARDS, huntDone, huntGiftId } from './halloween'
import type { Save } from './meta'

/**
 * The game-made gifts (the Noite das Bruxas candy jar's and the Caça aos
 * Fantasmas') a save applied and earned, as `keepGiven` takes them: the API
 * runs `keepGiven` with these besides the player's own gifts, so the Pumpkin
 * King, the Exorcist or the spectral frame aren't taken for an edit. A reward
 * counts when its id is in `save.gifts` and the save holds what the client
 * asks before granting it (`halloweenGifts`): the jar's candies for a jar
 * reward, every night boss for the hunt's. The frame for showing up asks for
 * an event day, which a save doesn't record, so its id alone vouches for it.
 * Candies and bosses are reported by the device, trusted like the rest of the
 * save. Pure; shared with the API.
 */
export const gameGiftsApplied = (save: Save): Pick<Gift, 'id' | 'content'>[] => [
  ...HALLOWEEN_REWARDS.flatMap((r, i) => {
    const id = halloweenGiftId(i)
    return save.gifts.includes(id) && save.halloween.candies >= r.candies ? [{ id, content: r.content }] : []
  }),
  ...(huntDone(save.halloween)
    ? HUNT_REWARDS.flatMap((content, i) => {
        const id = huntGiftId(i)
        return save.gifts.includes(id) ? [{ id, content }] : []
      })
    : []),
]
