import { isRecord, wholeNumber } from './parse'

/**
 * The Bag: items bought at the Poké Mart's counter (or paid by missions)
 * that boost one run. The player arms them on the select screen and the next
 * run uses them up as it starts (`useArmed`), recording them in its
 * `ReplayStart`. Pure; shared with the API through the save.
 */

/** What each item does for the run that uses it. Names stay in English (official); descriptions live in `i18n`. */
export const BAG_ITEMS = {
  /** Wild shinies twice as likely (outbreak included). */
  lure: { name: 'Lure', boost: 2 },
  /** Eggs twice as likely to drop. */
  incense: { name: 'Incense', boost: 2 },
} as const satisfies Record<string, { name: string; boost: number }>

export type BagItem = keyof typeof BAG_ITEMS

export const BAG_ITEM_IDS = Object.keys(BAG_ITEMS) as BagItem[]

/**
 * Per item, how many the player ever got and ever used (what's left is the
 * difference), and whether the next run uses one. Two counters instead of a
 * count, so two devices merge without bringing a used item back (`mergeBag`).
 */
export type Bag = Counts & { armed: Readonly<Record<BagItem, boolean>> }

type Counts = Readonly<Record<BagItem, { got: number; used: number }>>

export const EMPTY_BAG: Bag = {
  lure: { got: 0, used: 0 },
  incense: { got: 0, used: 0 },
  armed: { lure: false, incense: false },
}

/** How many of `id` are left. */
export const bagCount = (bag: Bag, id: BagItem) => Math.max(0, bag[id].got - bag[id].used)

/** Puts `n` of `id` in the bag (a purchase, a mission reward, a gift). */
export const addToBag = (bag: Bag, id: BagItem, n = 1): Bag => ({ ...bag, [id]: { ...bag[id], got: bag[id].got + Math.max(0, n) } })

/** Arms (or disarms) `id` for the next run. Only an item the player has can be armed. */
export const armItem = (bag: Bag, id: BagItem, on: boolean): Bag => ({ ...bag, armed: { ...bag.armed, [id]: on && bagCount(bag, id) > 0 } })

/** The items a run starting now uses: the armed ones still in the bag. */
export const armedItems = (bag: Bag): Record<BagItem, boolean> =>
  Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, bag.armed[id] && bagCount(bag, id) > 0])) as Record<BagItem, boolean>

/** A run starts: each armed item is used up and disarmed (the pick is for one run). Returns what the run got. */
export const useArmed = (bag: Bag): { bag: Bag; used: Record<BagItem, boolean> } => {
  const used = armedItems(bag)
  const next = BAG_ITEM_IDS.reduce<Bag>((b, id) => (used[id] ? { ...b, [id]: { ...b[id], used: b[id].used + 1 } } : b), bag)
  return { bag: { ...next, armed: { lure: false, incense: false } }, used }
}

/**
 * Both bags in one: each counter keeps the larger side (an item got on
 * either side is there, one used on either side is gone); the armed picks
 * are `incoming`'s, a setting like the difficulty.
 */
export const mergeBag = (base: Bag, incoming: Bag): Bag => {
  const counts = Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, { got: Math.max(base[id].got, incoming[id].got), used: Math.max(base[id].used, incoming[id].used) }])) as Counts
  const merged = { ...counts, armed: EMPTY_BAG.armed }
  return { ...merged, armed: armedItems({ ...merged, armed: incoming.armed }) }
}

/** The save's `bag`: counters clamped to whole numbers (never more used than got), unknown items dropped. */
export const parseBag = (raw: unknown): Bag => {
  if (!isRecord(raw)) return EMPTY_BAG
  const armed = isRecord(raw.armed) ? raw.armed : {}
  const counts = Object.fromEntries(
    BAG_ITEM_IDS.map((id) => {
      const entry = isRecord(raw[id]) ? raw[id] : {}
      const got = wholeNumber(entry.got)
      return [id, { got, used: wholeNumber(entry.used, got) }]
    }),
  ) as Counts
  const bag = { ...counts, armed: EMPTY_BAG.armed }
  return { ...bag, armed: armedItems({ ...bag, armed: Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, armed[id] === true])) as Record<BagItem, boolean> }) }
}
