import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { formAt } from './branch'
import type { Save } from './meta'
import { playsShiny } from './shinyPicks'
import { isSpecialCompanion, SPECIAL_COMPANIONS } from '../data/companions'
import { canWalkWith, isGoldSupporter, isSupporter, type Companion, type SupporterTier } from './supporters'

/**
 * The trainer's face on the Trainer chip and card: the supporter's companion
 * when one walks along (their pick), else the save's `partner` (the last
 * Pokémon picked), at its line's final stage, shiny when the save plays it shiny.
 */
export const trainerAvatar = (save: Save) => {
  const companion = save.companion && isSupporter(save) && canWalkWith(save, save.companion) ? save.companion : null
  const walking = companion?.id
  if (walking !== undefined && isSpecialCompanion(walking)) return { dex: SPECIAL_COMPANIONS[walking].dex, shiny: companion?.shiny === true }
  const id: PlayableId = walking ?? save.partner
  const shiny = companion ? companion.shiny : playsShiny(save, id)
  // A branching family wears the branch it took last (an Espeon trainer stays an Espeon).
  return { dex: formAt(id, save.branches[id] ?? null, PLAYABLE[id].line.length - 1).dex, shiny }
}

/**
 * The supporter tier this save got the thank-you of, without asking the API:
 * the Supporter title, and the gold background on top of it at gold.
 */
export const savedSupporterTier = (save: Save): SupporterTier | null => (!isSupporter(save) ? null : isGoldSupporter(save) ? 'gold' : 'supporter')

/**
 * The Pokémon a supporter stands with on the Hall da Fama (the API reads it
 * from their synced save): a shiny they picked with a ticket (in the form
 * they play it, Shiny unless switched to Normal), else their companion, else
 * their partner, shiny when they play it so. Only supporters reach the wall,
 * so the companion needs no title check here.
 */
export const hallPokemon = (save: Save): Companion => {
  const picked = save.shinyPicks.findLast((p) => p.pick !== null)?.pick
  if (picked) return { id: picked, shiny: save.shinyStarters[picked] !== false }
  if (save.companion && canWalkWith(save, save.companion)) return save.companion
  return { id: save.partner, shiny: playsShiny(save, save.partner) }
}
