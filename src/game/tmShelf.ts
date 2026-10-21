import { createRng, seedFrom } from '../engine/rng'
import { SHOP_LEVELS, TM_SHELF, type ShopLevel } from '../data/shop'
import { addDays, dayNumber, type DayKey } from './day'
import type { Save } from './meta'
import type { MoveId } from './moves'
import { isRecord, knownIds } from './parse'
import { shopTmMoveIds, type ShopTmMoveId } from './shopTmMoves'
import { tmMoveIds, type TmMoveId } from './tmMoves'

/**
 * The Kecleon Shop's TM shelf (the purple brother's, from the Tent): TMs
 * bought for good into the save's TM case, and armed before a run up to the
 * shop level's `armedTms`. A run's armed TMs ride in its `ReplayStart.tms`;
 * its first TM discs and Move Tutor lessons teach them (`tms.ts`). The shelf
 * lists every TM a run ever taught ("found it in a run, now buy it") and the
 * shop-exclusive TMs; the other regular TMs rotate `TM_SHELF.rotation` a
 * Brasília day, the same for everyone, each back within 7 days. Legendary
 * (gold) TMs are never sold. Pure; shared with the API through the save.
 */

/** A TM the shelf sells: a regular one (a boss disc's move) or a shop-exclusive one. */
export type ShelfTm = TmMoveId | ShopTmMoveId

let catalog: readonly ShelfTm[] | null = null

/**
 * Every TM the shelf can sell, regular ones first. Built on first use: the
 * move tables may still be loading when this module is (it's reached from the save).
 */
export const shelfTms = (): readonly ShelfTm[] => (catalog ??= [...tmMoveIds(), ...shopTmMoveIds()])

/** The regular TMs (the boss discs' moves), in table order. */
const regular = (): readonly TmMoveId[] => tmMoveIds()

/** Whether `id` is a regular TM (a boss disc's move), the ones the rotation deals. */
export const isRegularTm = (id: ShelfTm): id is TmMoveId => regular().some((m) => m === id)

/** Whether `id` is sold only here (a shop-exclusive TM). */
export const isExclusiveTm = (id: ShelfTm) => shopTmMoveIds().some((m) => m === id)

export const isShelfTm = (v: unknown): v is ShelfTm => shelfTms().some((id) => id === v)

/** What a TM costs. */
export const tmPrice = (id: ShelfTm) => (isExclusiveTm(id) ? TM_SHELF.exclusive : TM_SHELF.price)

/**
 * The save's TM case: the TMs owned (bought), the ones armed for the next
 * runs (they stay armed run after run, being owned), and the regular TM
 * moves any run ever taught, which the shelf always lists.
 */
export type TmCase = { owned: readonly ShelfTm[]; armed: readonly ShelfTm[]; learned: readonly TmMoveId[] }

export const NO_TMS: TmCase = { owned: [], armed: [], learned: [] }

/* ---------------- The rotation ---------------- */

/** Days one pass of the rotation lasts: every regular TM shows once in it. */
export const tmCycle = () => Math.ceil(regular().length / TM_SHELF.rotation)

const EPOCH = dayNumber(TM_SHELF.epoch)

const cycleOrder = (cycle: number) => {
  const rng = createRng(seedFrom(`tm-shelf:${cycle}`))
  const order = [...regular()]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

/**
 * The regular TMs rotating on the shelf on `day`: one seeded shuffle per
 * `tmCycle()` days, dealt `TM_SHELF.rotation` a day, so a TM shows once a
 * cycle and is never gone for more than `2 × tmCycle() − 1` days (7 with 12
 * TMs; `tmShelf.test.ts` checks it).
 */
export const tmRotation = (day: DayKey): readonly TmMoveId[] => {
  const n = dayNumber(day) - EPOCH
  const days = tmCycle()
  const cycle = Math.floor(n / days)
  const slot = n - cycle * days
  // The last day of a cycle may deal the leftovers plus the next cycle's first ones, so every day shows a full rotation.
  const order = [...cycleOrder(cycle), ...cycleOrder(cycle + 1)]
  return order.slice(slot * TM_SHELF.rotation, (slot + 1) * TM_SHELF.rotation)
}

/** The first day from `from` on (that day included) the rotation shows `id`, for "back on Saturday"; null past `horizon` days. */
export const nextTmDay = (id: TmMoveId, from: DayKey, horizon = 14): DayKey | null => {
  for (let i = 0; i <= horizon; i++) {
    const day = addDays(from, i)
    if (tmRotation(day).includes(id)) return day
  }
  return null
}

/** Why a TM is on the shelf on `day`: an exclusive, one a run taught (always there), or today's rotation. Null: not today. */
export const tmListing = (tms: TmCase, id: ShelfTm, day: DayKey): 'exclusive' | 'learned' | 'today' | null => {
  if (isExclusiveTm(id)) return 'exclusive'
  if (tms.learned.some((m) => m === id)) return 'learned'
  return tmRotation(day).some((m) => m === id) ? 'today' : null
}

/** The shelf on `day`, in catalog order: the exclusives, then the regular TMs a run taught or today's rotation brings, then the ones owned already. */
export const shelfOf = (tms: TmCase, day: DayKey): ShelfTm[] => shelfTms().filter((id) => tms.owned.includes(id) || tmListing(tms, id, day) !== null)

/* ---------------- Buying and arming ---------------- */

export type TmBlock = 'locked' | 'owned' | 'away' | 'poor'

/** Why `id` can't be bought on `day`: the shelf isn't open at the save's level, it's owned, it isn't on the shelf today, or the wallet can't pay. */
export const tmBlock = (save: Save, id: ShelfTm, day: DayKey): TmBlock | null => {
  if (!SHOP_LEVELS[save.shop.level].shelves.tms) return 'locked'
  if (save.tms.owned.includes(id)) return 'owned'
  if (tmListing(save.tms, id, day) === null) return 'away'
  return save.wallet < tmPrice(id) ? 'poor' : null
}

/** How many TMs the save's shop level arms at once. */
export const tmLimit = (level: ShopLevel) => SHOP_LEVELS[level].armedTms

/** The TMs a run starting now brings: the armed ones owned, the first `limit` of them in the order armed. */
export const armedTms = (tms: TmCase, limit: number): ShelfTm[] => tms.armed.filter((id) => tms.owned.includes(id)).slice(0, limit)

/** Arms (`on`) or disarms `id`. Arming one not owned does nothing; past the limit, the oldest armed one makes room. */
export const armTm = (tms: TmCase, id: ShelfTm, on: boolean, limit: number): TmCase => {
  if (!on) return { ...tms, armed: tms.armed.filter((m) => m !== id) }
  if (!tms.owned.includes(id) || tms.armed.includes(id) || limit <= 0) return tms
  return { ...tms, armed: [...armedTms(tms, limit), id].slice(-limit) }
}

/** Buys a TM for good (₽ into `spent`, like the Vitrine), armed right away when a slot is free. Null when blocked (`tmBlock`). */
export const buyTm = (save: Save, id: ShelfTm, day: DayKey): Save | null => {
  if (tmBlock(save, id, day)) return null
  const price = tmPrice(id)
  const owned = { ...save.tms, owned: shelfTms().filter((m) => m === id || save.tms.owned.includes(m)) }
  const limit = tmLimit(save.shop.level)
  const tms = armedTms(owned, limit).length < limit ? armTm(owned, id, true, limit) : owned
  return { ...save, wallet: save.wallet - price, spent: save.spent + price, tms }
}

/** A finished run's TMs: the regular TM moves it learned join the shelf's list for good. */
export const learnTms = (tms: TmCase, learned: readonly MoveId[]): TmCase => {
  const fresh = regular().filter((id) => learned.includes(id) && !tms.learned.includes(id))
  return fresh.length === 0 ? tms : { ...tms, learned: regular().filter((id) => tms.learned.includes(id) || fresh.includes(id)) }
}

/* ---------------- Sync and parsing ---------------- */

/** Two TM cases: what's owned and what runs taught are unions (nothing bought or found is lost); the armed picks are `incoming`'s, a setting like the Bag's. */
export const mergeTms = (base: TmCase, incoming: TmCase): TmCase => {
  const owned = shelfTms().filter((id) => base.owned.includes(id) || incoming.owned.includes(id))
  return {
    owned,
    armed: incoming.armed.filter((id) => owned.includes(id)),
    learned: regular().filter((id) => base.learned.includes(id) || incoming.learned.includes(id)),
  }
}

/** The shelf TMs of an untrusted list, each once, in the list's order (the order armed matters: the first disc teaches the first). */
export const parseTmList = (raw: unknown): ShelfTm[] => (Array.isArray(raw) ? raw.filter((v, i): v is ShelfTm => isShelfTm(v) && raw.indexOf(v) === i) : [])

/** The save's `tms`: known TMs only, armed ones owned. */
export const parseTms = (raw: unknown): TmCase => {
  if (!isRecord(raw)) return NO_TMS
  const owned = knownIds(raw.owned, shelfTms())
  return { owned, armed: parseTmList(raw.armed).filter((id) => owned.includes(id)), learned: knownIds(raw.learned, regular()) }
}
