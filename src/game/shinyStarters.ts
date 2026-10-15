import { PLAYABLE_IDS, type PlayableId } from '../data/hatchlings'
import { isRecord } from './parse'

/**
 * Shiny starters for good: rolling the 1/64 shiny on a Pokémon unlocks its
 * shiny form forever, and the select screen then offers Normal or Shiny.
 * Saved as `{ [id]: picked }`: a key means unlocked, its value whether the
 * next run plays it shiny. Pure; shared with the API through the save.
 */
export type ShinyStarters = Readonly<Partial<Record<PlayableId, boolean>>>

export const NO_SHINY_STARTERS: ShinyStarters = {}

/** Unlocks `id`'s shiny (picked, since the player just met it shiny). Already unlocked: the pick stays. */
export const unlockShinyStarter = (owned: ShinyStarters, id: PlayableId): ShinyStarters => (id in owned ? owned : { ...owned, [id]: true })

/** Picks Normal or Shiny for an unlocked starter; a locked one stays locked. */
export const pickShinyStarter = (owned: ShinyStarters, id: PlayableId, shiny: boolean): ShinyStarters => (id in owned ? { ...owned, [id]: shiny } : owned)

/** Both in one: every starter either unlocked, with `incoming`'s pick when it has one (a setting, like the difficulty). */
export const mergeShinyStarters = (base: ShinyStarters, incoming: ShinyStarters): ShinyStarters =>
  Object.fromEntries(PLAYABLE_IDS.flatMap((id) => (id in incoming ? [[id, incoming[id] === true]] : id in base ? [[id, base[id] === true]] : [])))

/** The save's `shinyStarters`: unknown Pokémon and non-boolean picks are dropped. */
export const parseShinyStarters = (raw: unknown): ShinyStarters =>
  isRecord(raw) ? Object.fromEntries(PLAYABLE_IDS.flatMap((id) => (typeof raw[id] === 'boolean' ? [[id, raw[id]]] : []))) : NO_SHINY_STARTERS
