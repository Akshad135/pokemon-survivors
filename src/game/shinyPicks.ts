import { isHatchling, PLAYABLE, PLAYABLE_IDS, type PlayableId } from '../data/hatchlings'
import { markHatch } from './dex'
import type { Save } from './meta'
import { isRecord } from './parse'
import { isPlayable } from './ranking'
import { unlockShinyStarter } from './shinyStarters'

/**
 * Shiny à escolha: a Mystery Gift (`shinyPick`, the supporters' thank-you)
 * that leaves a ticket in the save, and the player spends it on any Pokémon
 * they can play shiny: a starter, or an egg family (unlocked on the spot,
 * hatched shiny). The save keeps every ticket with what it became, so a ticket
 * is spent once on every device (merged by id). Pure; shared with the API.
 */

/** A ticket: the gift's id, and the Pokémon it became (null while it waits for a pick). */
export type ShinyPick = { id: string; pick: PlayableId | null }

/** Families a ticket can't pick: Munchlax stays the reward for bringing 10 friends (`game/referral.ts`). */
const NOT_PICKABLE: ReadonlySet<PlayableId> = new Set(['munchlax'])

/** The player can already play `id` shiny: a starter rolled shiny once, or a family hatched shiny. */
export const ownsShiny = (save: Save, id: PlayableId) => id in save.shinyStarters || (isHatchling(id) && save.hatched[id]?.shiny === true)

/** What a ticket can become, in the select screen's order: every Pokémon not shiny yet (Munchlax aside). */
export const shinyChoices = (save: Save): PlayableId[] => PLAYABLE_IDS.filter((id) => !NOT_PICKABLE.has(id) && !ownsShiny(save, id))

/** Tickets still waiting for a pick. */
export const pendingPicks = (save: Save) => save.shinyPicks.filter((p) => p.pick === null)

/** A gift's ticket joins the save (once). */
export const grantShinyPick = (save: Save, id: string): Save =>
  save.shinyPicks.some((p) => p.id === id) ? save : { ...save, shinyPicks: [...save.shinyPicks, { id, pick: null }] }

/**
 * Spends the ticket `ticket` on `id`: a starter's shiny unlocks (and is
 * picked, like a lucky roll); an egg family hatches shiny, unlocked if it
 * wasn't. Both count as caught shiny in the Pokédex. Null when the ticket
 * isn't waiting or `id` can't be picked.
 */
export const pickShiny = (save: Save, ticket: string, id: PlayableId): Save | null => {
  if (!save.shinyPicks.some((p) => p.id === ticket && p.pick === null) || !shinyChoices(save).includes(id)) return null
  const dex = markHatch(save.dex, PLAYABLE[id].line.map((stage) => stage.dex), true)
  const shinyPicks = save.shinyPicks.map((p) => (p.id === ticket ? { id: p.id, pick: id } : p))
  if (isHatchling(id)) return { ...save, dex, shinyPicks, hatched: { ...save.hatched, [id]: { shiny: true } } }
  return { ...save, dex, shinyPicks, shinyStarters: unlockShinyStarter(save.shinyStarters, id) }
}

/** Both lists in one, a ticket per id; a pick made on either side stays made. Sorted by id, so the merge comes out the same either way. */
export const mergeShinyPicks = (a: readonly ShinyPick[], b: readonly ShinyPick[]): ShinyPick[] => {
  const byId = new Map<string, ShinyPick>()
  for (const p of [...a, ...b]) byId.set(p.id, { id: p.id, pick: byId.get(p.id)?.pick ?? p.pick })
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
}

/** The save's `shinyPicks`: the valid tickets, one per id. */
export const parseShinyPicks = (v: unknown): ShinyPick[] =>
  Array.isArray(v)
    ? mergeShinyPicks(
        [],
        v.flatMap((p: unknown) =>
          isRecord(p) && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 64 ? [{ id: p.id, pick: isPlayable(p.pick) ? p.pick : null }] : [],
        ),
      )
    : []
