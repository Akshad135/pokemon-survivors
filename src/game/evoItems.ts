import { BAG_ITEMS, BOTTLE_CAPS, EVO_ITEM_IDS, EVO_ITEM_PRICE, EVO_ITEMS, MAX_CAPS, SHOP_LEVELS, type BagItem, type EvoItemId } from '../data/shop'
import { BRANCHES, type BranchDef, type BranchId } from '../data/branches'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { Save } from './meta'
import { isRecord, knownIds, wholeNumber } from './parse'

/**
 * The purple brother's evolution shelf and the Treino's Bottle Caps, both
 * from the Shop (Lv 3), both owned for good. An evolution item unlocks the
 * branches it names (`branchNeeds`, `evolutionOffers`): the run gets the
 * save's items in its `ReplayStart.evo`, and may find more (`evoGate.ts`). A Bottle Cap level
 * makes every stat of one Pokémon `BOTTLE_CAPS.boost` stronger in its runs
 * (`runBoost`, `ReplayStart.caps`). Pure; shared with the API through the save.
 */

/* ---------------- Evolution items ---------------- */

/** The item that names `branch`, if any: it unlocks it, or adds it to the choice for a `free` one (the branch card shows it). */
export const evoItemFor = (branch: BranchId): EvoItemId | null => EVO_ITEM_IDS.find((id) => EVO_ITEMS[id].branches.some((b) => b === branch)) ?? null

/** The item a run needs to take `branch`, or null when it's free (no item names it, or it's marked `free`). */
export const branchNeeds = (branch: BranchId): EvoItemId | null => {
  const def: BranchDef = BRANCHES[branch]
  return def.free ? null : evoItemFor(branch)
}

export type EvoBlock = 'locked' | 'owned' | 'poor'

/** Why an evolution item can't be bought: the shelf isn't open at the save's level, it's owned, or the wallet can't pay. */
export const evoBlock = (save: Save, id: EvoItemId): EvoBlock | null => {
  if (!SHOP_LEVELS[save.shop.level].shelves.evolution) return 'locked'
  if (save.evo.includes(id)) return 'owned'
  return save.wallet < EVO_ITEM_PRICE ? 'poor' : null
}

/** Buys an evolution item for good (₽ into `spent`). Null when blocked (`evoBlock`). */
export const buyEvoItem = (save: Save, id: EvoItemId): Save | null =>
  evoBlock(save, id) ? null : { ...save, wallet: save.wallet - EVO_ITEM_PRICE, spent: save.spent + EVO_ITEM_PRICE, evo: EVO_ITEM_IDS.filter((x) => x === id || save.evo.includes(x)) }

/** Two sides' items: a union. */
export const mergeEvoItems = (base: readonly EvoItemId[], incoming: readonly EvoItemId[]): EvoItemId[] => EVO_ITEM_IDS.filter((id) => base.includes(id) || incoming.includes(id))

/** Evolution items from an untrusted list (the save, a replay): known ones, each once, in catalog order. */
export const parseEvoItems = (raw: unknown): EvoItemId[] => knownIds(raw, EVO_ITEM_IDS)

/* ---------------- Bottle Caps ---------------- */

/** Every playable Pokémon, legends included: each can wear its own caps. */
const playableIds = () => Object.keys(PLAYABLE) as PlayableId[]

/** Bottle Cap levels per Pokémon (1..`MAX_CAPS`; a Pokémon without one isn't listed). */
export type Caps = Readonly<Partial<Record<PlayableId, number>>>

/** A Pokémon's Bottle Cap level (0 without any). */
export const capLevel = (caps: Caps, id: PlayableId) => caps[id] ?? 0

/** What the next Bottle Cap for a Pokémon at `level` costs, or null at the top. */
export const capPrice = (level: number): number | null => BOTTLE_CAPS.prices[level] ?? null

export type CapBlock = 'locked' | 'max' | 'poor'

/** Why `id` can't get its next Bottle Cap: the Treino sells none at the save's level, it's at the top, or the wallet can't pay. */
export const capBlock = (save: Save, id: PlayableId): CapBlock | null => {
  if (!SHOP_LEVELS[save.shop.level].shelves.caps) return 'locked'
  const price = capPrice(capLevel(save.caps, id))
  if (price === null) return 'max'
  return save.wallet < price ? 'poor' : null
}

/** Buys `id`'s next Bottle Cap (₽ into `spent`). Null when blocked (`capBlock`). */
export const buyCap = (save: Save, id: PlayableId): Save | null => {
  if (capBlock(save, id)) return null
  const level = capLevel(save.caps, id)
  const price = capPrice(level)!
  return { ...save, wallet: save.wallet - price, spent: save.spent + price, caps: { ...save.caps, [id]: level + 1 } }
}

/**
 * Raises `id` straight to `level` Bottle Caps, for free: the hook PR 5's
 * Gold Bottle Cap (Meowth's caravan) pays through after charging its price.
 */
export const grantCaps = (caps: Caps, id: PlayableId, level: number = MAX_CAPS): Caps => ({ ...caps, [id]: Math.max(capLevel(caps, id), Math.min(MAX_CAPS, level)) })

/**
 * The share every stat of a run grows by (`boostStats`): `BOTTLE_CAPS.boost`
 * per cap level of the Pokémon played, plus an Everstone's. It applies the
 * same to a legend: it lifts the player's stats, while a legend's difficulty
 * multipliers (`runMods`) only touch the foes.
 */
export const runBoost = (caps: number, bag: readonly BagItem[]) =>
  Math.min(MAX_CAPS, Math.max(0, caps)) * BOTTLE_CAPS.boost + (bag.includes('everstone') ? BAG_ITEMS.everstone.effect.everstone : 0)

/** Two sides' caps: each Pokémon at the higher level. */
export const mergeCaps = (base: Caps, incoming: Caps): Caps =>
  Object.fromEntries(playableIds().flatMap((id) => {
    const level = Math.max(capLevel(base, id), capLevel(incoming, id))
    return level > 0 ? [[id, level]] : []
  }))

/** The save's `caps`: known Pokémon, levels clamped to 1..`MAX_CAPS`. */
export const parseCaps = (raw: unknown): Caps =>
  isRecord(raw)
    ? Object.fromEntries(playableIds().flatMap((id) => {
        const level = wholeNumber(raw[id], MAX_CAPS)
        return level > 0 ? [[id, level]] : []
      }))
    : {}
