import { isHatchling, PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { Save } from './meta'
import { ownsStyle } from './style'
import { canWalkWith, isSupporter, type Companion, type SupporterTier } from './supporters'

/** Whether the save plays `id` shiny: a starter's shiny picked, or a family hatched shiny. */
const playsShiny = (save: Save, id: PlayableId) => save.shinyStarters[id] === true || (isHatchling(id) && save.hatched[id]?.shiny === true)

/**
 * The trainer's face on the Trainer chip and card: the supporter's companion
 * when one walks along (their pick), else the save's `partner` (the last
 * Pokémon picked), at its line's final stage, shiny when the save plays it shiny.
 */
export const trainerAvatar = (save: Save) => {
  const companion = save.companion && isSupporter(save) && canWalkWith(save, save.companion) ? save.companion : null
  const id: PlayableId = companion?.id ?? save.partner
  const line = PLAYABLE[id].line
  const shiny = companion ? companion.shiny : playsShiny(save, id)
  return { dex: line[line.length - 1]!.dex, shiny }
}

/**
 * The supporter tier this save got the thank-you of, without asking the API:
 * the Supporter title, and the gold background on top of it at gold.
 */
export const savedSupporterTier = (save: Save): SupporterTier | null =>
  !isSupporter(save) ? null : ownsStyle(save.style, 'background', 'supporter') ? 'gold' : 'supporter'

/**
 * The Pokémon a supporter stands with on the Hall da Fama (the API reads it
 * from their synced save): a shiny they picked with a ticket, else their
 * companion, else their partner, shiny when they play it so. Only supporters
 * reach the wall, so the companion needs no title check here.
 */
export const hallPokemon = (save: Save): Companion => {
  const picked = save.shinyPicks.findLast((p) => p.pick !== null)?.pick
  if (picked) return { id: picked, shiny: true }
  if (save.companion && canWalkWith(save, save.companion)) return save.companion
  return { id: save.partner, shiny: playsShiny(save, save.partner) }
}
