import { isHatchling, PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { Save } from './meta'
import { ownsStyle } from './style'
import { canWalkWith, isSupporter, type SupporterTier } from './supporters'

/**
 * The trainer's face on the Trainer chip and card: the supporter's companion
 * when one walks along (their pick), else the save's `partner` (the last
 * Pokémon picked), at its line's final stage, shiny when the save plays it shiny.
 */
export const trainerAvatar = (save: Save) => {
  const companion = save.companion && isSupporter(save) && canWalkWith(save, save.companion) ? save.companion : null
  const id: PlayableId = companion?.id ?? save.partner
  const line = PLAYABLE[id].line
  const shiny = companion ? companion.shiny : save.shinyStarters[id] === true || (isHatchling(id) && save.hatched[id]?.shiny === true)
  return { dex: line[line.length - 1]!.dex, shiny }
}

/**
 * The supporter tier this save got the thank-you of, without asking the API:
 * the Supporter title, and the gold background on top of it at gold.
 */
export const savedSupporterTier = (save: Save): SupporterTier | null =>
  !isSupporter(save) ? null : ownsStyle(save.style, 'background', 'supporter') ? 'gold' : 'supporter'
