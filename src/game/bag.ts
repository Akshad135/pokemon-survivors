import { BAG_ITEM_IDS, BAG_ITEMS, type BagItem } from '../data/shop'
import { isRecord, wholeNumber } from './parse'
import type { StatDelta } from './stats'

export { BAG_ITEM_IDS, BAG_ITEMS, type BagItem }

/**
 * The Bag: consumables bought at the Kecleon Shop's Vitrine (or paid by
 * missions and the daily gift) that boost one run. The player arms them on
 * the select screen, one of each and as many different ones as the shop's
 * level allows (`SHOP_LEVELS[level].bagSlots`), and the next run uses them up
 * as it starts (`useArmed`), recording them in its `ReplayStart`. Pure;
 * shared with the API through the save.
 */

/**
 * Per item, how many the player ever got and ever used (what's left is the
 * difference), and whether the next run uses one. Two counters instead of a
 * count, so two devices merge without bringing a used item back (`mergeBag`).
 */
export type Bag = Counts & { armed: Readonly<Record<BagItem, boolean>> }

type Counts = Readonly<Record<BagItem, { got: number; used: number }>>

const NOT_ARMED = Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, false])) as Record<BagItem, boolean>

export const EMPTY_BAG: Bag = { ...(Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, { got: 0, used: 0 }])) as Counts), armed: NOT_ARMED }

/** How many of `id` are left. */
export const bagCount = (bag: Bag, id: BagItem) => Math.max(0, bag[id].got - bag[id].used)

/** Puts `n` of `id` in the bag (a purchase, a mission reward, a gift). */
export const addToBag = (bag: Bag, id: BagItem, n = 1): Bag => ({ ...bag, [id]: { ...bag[id], got: bag[id].got + Math.max(0, n) } })

/** The items a run starting now uses: the armed ones still in the bag, the first `limit` of them in catalog order. */
export const armedItems = (bag: Bag, limit = Infinity): BagItem[] => BAG_ITEM_IDS.filter((id) => bag.armed[id] && bagCount(bag, id) > 0).slice(0, limit)

/** Why `id` can't be armed now (none left, or `limit` different items armed already), or null when it can. */
export const armBlock = (bag: Bag, id: BagItem, limit: number): 'empty' | 'full' | null => {
  if (bagCount(bag, id) === 0) return 'empty'
  return !bag.armed[id] && armedItems(bag).length >= limit ? 'full' : null
}

/** Arms (or disarms) `id` for the next run; arming does nothing when blocked (`armBlock`). */
export const armItem = (bag: Bag, id: BagItem, on: boolean, limit: number): Bag =>
  on && armBlock(bag, id, limit) ? bag : { ...bag, armed: { ...bag.armed, [id]: on } }

/**
 * A run starts: each armed item (up to `limit`) is used up and every pick is
 * disarmed (it's for one run). `keep` leaves an item that does nothing in this
 * run in the bag (Honey in a run without an outbreak). Returns what the run got.
 */
export const useArmed = (bag: Bag, limit: number, keep: (id: BagItem) => boolean = () => false): { bag: Bag; used: BagItem[] } => {
  const used = armedItems(bag, limit).filter((id) => !keep(id))
  const next = used.reduce<Bag>((b, id) => ({ ...b, [id]: { ...b[id], used: b[id].used + 1 } }), bag)
  return { bag: { ...next, armed: NOT_ARMED }, used }
}

/** The stat layers a run's Bag items add (Lucky Egg, Luck Incense, X Attack), for `recomputeStats`. */
export const bagDeltas = (used: readonly BagItem[]): StatDelta[] =>
  used.flatMap((id) => {
    const effect = BAG_ITEMS[id].effect
    return 'stat' in effect ? [effect.stat] : []
  })

/** A run's Bag items from an untrusted list (a replay, a stored run): known ids, each once, in catalog order. */
export const parseBagItems = (raw: unknown): BagItem[] => (Array.isArray(raw) ? BAG_ITEM_IDS.filter((id) => raw.includes(id)) : [])

/**
 * Both bags in one: each counter keeps the larger side (an item got on
 * either side is there, one used on either side is gone); the armed picks
 * are `incoming`'s, a setting like the difficulty.
 */
export const mergeBag = (base: Bag, incoming: Bag): Bag => {
  const counts = Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, { got: Math.max(base[id].got, incoming[id].got), used: Math.max(base[id].used, incoming[id].used) }])) as Counts
  return withArmed(counts, incoming.armed)
}

/** Counters with only the picks still in the bag armed. */
const withArmed = (counts: Counts, armed: Readonly<Record<string, unknown>>): Bag => {
  const bag = { ...counts, armed: NOT_ARMED }
  return { ...bag, armed: Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, armed[id] === true && bagCount(bag, id) > 0])) as Record<BagItem, boolean> }
}

/** The save's `bag`: counters clamped to whole numbers (never more used than got), unknown items dropped. */
export const parseBag = (raw: unknown): Bag => {
  if (!isRecord(raw)) return EMPTY_BAG
  const counts = Object.fromEntries(
    BAG_ITEM_IDS.map((id) => {
      const entry = isRecord(raw[id]) ? raw[id] : {}
      const got = wholeNumber(entry.got)
      return [id, { got, used: wholeNumber(entry.used, got) }]
    }),
  ) as Counts
  return withArmed(counts, isRecord(raw.armed) ? raw.armed : {})
}
