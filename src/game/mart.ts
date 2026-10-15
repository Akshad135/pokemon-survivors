import { createRng, pick, seedFrom, weightedPick } from '../engine/rng'
import { stylePrice, type StyleId, type StyleSlot } from '../data/style'
import { addToBag, type BagItem } from './bag'
import type { DayKey } from './day'
import { EGGS, grantEgg, type EggTier } from './eggs'
import type { Save } from './meta'
import { isRecord, wholeNumber } from './parse'
import { grantStyle, ownsStyle } from './style'

/**
 * The Poké Mart's two newer shelves. The counter (Balcão do dia) turns over
 * at midnight in Brasília, the same for everyone: a Lure, an Incense, one egg
 * whose tier the day draws, and one of the three on sale. Each has a daily
 * stock. The style shelf sells the cards' and the PC's looks for good.
 * Everything bought spends ₽ into the save's `spent`, so an account merge
 * never pays it back (`game/sync.ts`). Pure.
 */

export const COUNTER_SLOTS = ['lure', 'incense', 'egg'] as const satisfies readonly (BagItem | 'egg')[]

export type CounterSlot = (typeof COUNTER_SLOTS)[number]

/** Price and daily stock of the counter's items; the egg's price is its tier's. */
export const COUNTER = {
  lure: { price: 800, stock: 3 },
  incense: { price: 600, stock: 3 },
  egg: { stock: 1 },
  /** The day's sale takes this much off. */
  sale: 0.3,
} as const

/** The egg on sale: each tier's price and its odds of being the day's. */
export const COUNTER_EGGS = {
  common: { price: 1500, weight: 60 },
  rare: { price: 4000, weight: 34 },
  ultra: { price: 9000, weight: 6 },
} as const satisfies Record<Exclude<EggTier, 'friend'>, { price: number; weight: number }>

/** What the counter offers on a day. */
export type Counter = { day: DayKey; egg: keyof typeof COUNTER_EGGS; sale: CounterSlot }

/** The counter of a Brasília day, drawn from the date. */
export const counterOf = (day: DayKey): Counter => {
  const rng = createRng(seedFrom(`counter:${day}`))
  const egg = weightedPick(rng, (Object.entries(COUNTER_EGGS) as Array<[keyof typeof COUNTER_EGGS, { weight: number }]>).map(([tier, e]) => [tier, e.weight] as const))
  return { day, egg, sale: pick(rng, COUNTER_SLOTS) }
}

const fullPrice = (counter: Counter, slot: CounterSlot) => (slot === 'egg' ? COUNTER_EGGS[counter.egg].price : COUNTER[slot].price)

/** Price of a counter item today, rounded to ₽10 after the sale. */
export const counterPrice = (counter: Counter, slot: CounterSlot) => Math.round((fullPrice(counter, slot) * (slot === counter.sale ? 1 - COUNTER.sale : 1)) / 10) * 10

/** What was bought from the counter on `day`; an older day's counts start over. */
export type CounterSave = { day: DayKey; bought: Readonly<Record<CounterSlot, number>> }

export const NO_COUNTER: CounterSave = { day: '', bought: { lure: 0, incense: 0, egg: 0 } }

const boughtOn = (save: CounterSave, day: DayKey) => (save.day === day ? save.bought : NO_COUNTER.bought)

/** How many of `slot` are left today. */
export const stockLeft = (save: CounterSave, counter: Counter, slot: CounterSlot) => Math.max(0, COUNTER[slot].stock - boughtOn(save, counter.day)[slot])

/** Why `slot` can't be bought now, or null when it can. */
export const counterBlock = (save: Save, counter: Counter, slot: CounterSlot): 'soldOut' | 'full' | 'poor' | null => {
  if (stockLeft(save.counter, counter, slot) === 0) return 'soldOut'
  if (slot === 'egg' && save.eggs.length >= EGGS.slots) return 'full'
  return save.wallet < counterPrice(counter, slot) ? 'poor' : null
}

/** Buys one `slot` from today's counter: an item goes into the bag, the egg into the incubator. Null when it can't (`counterBlock`). */
export const buyFromCounter = (save: Save, counter: Counter, slot: CounterSlot): Save | null => {
  if (counterBlock(save, counter, slot)) return null
  const price = counterPrice(counter, slot)
  const bought = boughtOn(save.counter, counter.day)
  const paid: Save = { ...save, wallet: save.wallet - price, spent: save.spent + price, counter: { day: counter.day, bought: { ...bought, [slot]: bought[slot] + 1 } } }
  return slot === 'egg' ? grantEgg(paid, counter.egg).save : { ...paid, bag: addToBag(paid.bag, slot) }
}

/** Buys a style for good. Null when it's owned already, not sold or too expensive. */
export const buyStyle = <S extends StyleSlot>(save: Save, slot: S, id: StyleId<S>): Save | null => {
  const price = stylePrice(slot, id)
  if (price === null || ownsStyle(save.style, slot, id) || save.wallet < price) return null
  return { ...save, wallet: save.wallet - price, spent: save.spent + price, style: grantStyle(save.style, slot, id) }
}

/** Two counters of the same player: the most recent day wins, and on the same day each item keeps the most bought. */
export const mergeCounter = (a: CounterSave, b: CounterSave): CounterSave => {
  if (a.day !== b.day) return a.day > b.day ? a : b
  return { day: a.day, bought: Object.fromEntries(COUNTER_SLOTS.map((slot) => [slot, Math.max(a.bought[slot], b.bought[slot])])) as Record<CounterSlot, number> }
}

/** The save's `counter`: a malformed one starts empty, counts clamped to the stock. */
export const parseCounter = (raw: unknown): CounterSave => {
  if (!isRecord(raw) || typeof raw.day !== 'string') return NO_COUNTER
  const bought = isRecord(raw.bought) ? raw.bought : {}
  return { day: raw.day, bought: Object.fromEntries(COUNTER_SLOTS.map((slot) => [slot, wholeNumber(bought[slot], COUNTER[slot].stock)])) as Record<CounterSlot, number> }
}
