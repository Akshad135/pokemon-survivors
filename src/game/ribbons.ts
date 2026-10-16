import { isDayKey, type DayKey } from './day'
import { isRecord, wholeNumber } from './parse'

/**
 * Fitas (ribbons) of the Desafio do dia (`game/challenge.ts`): once a day
 * closes, the API ranks its official attempts and sends each player a
 * Mystery Gift with their ribbon. Gold for the top 10%, silver for the top
 * half, bronze for taking part. The save keeps one per day (merged as a
 * union). Pure; shared with the API.
 */

export const RIBBON_TIERS = ['gold', 'silver', 'bronze'] as const

export type RibbonTier = (typeof RIBBON_TIERS)[number]

/** A day's ribbon, with where the player placed among how many. */
export type Ribbon = { day: DayKey; tier: RibbonTier; rank: number; total: number }

/** Share of the board each tier reaches down to. */
export const RIBBON_CUTS = { gold: 0.1, silver: 0.5 } as const

/**
 * The ribbon of a place on a board of `total` players. `rank` is a
 * competition rank (ties share the better one), so equal times get the same
 * ribbon. Cuts round up, so a tiny board still has a gold: the #1 always
 * gets it, and on two players the #2 gets bronze (the top half is just the #1).
 */
export const ribbonFor = (rank: number, total: number): RibbonTier => {
  if (rank <= Math.max(1, Math.ceil(total * RIBBON_CUTS.gold))) return 'gold'
  return rank <= Math.ceil(total * RIBBON_CUTS.silver) ? 'silver' : 'bronze'
}

const isTier = (v: unknown): v is RibbonTier => RIBBON_TIERS.some((t) => t === v)

/** One ribbon from untrusted data, or null. */
export const parseRibbon = (v: unknown): Ribbon | null => {
  if (!isRecord(v) || !isDayKey(v.day) || !isTier(v.tier)) return null
  const total = Math.max(1, wholeNumber(v.total))
  return { day: v.day, tier: v.tier, rank: Math.min(total, Math.max(1, wholeNumber(v.rank))), total }
}

/** The better of two ribbons of the same day: the higher tier, then the better place. */
const better = (a: Ribbon, b: Ribbon) => {
  const by = RIBBON_TIERS.indexOf(a.tier) - RIBBON_TIERS.indexOf(b.tier)
  return by < 0 || (by === 0 && a.rank <= b.rank) ? a : b
}

/** Both lists in one, a ribbon per day (the better one), oldest first, so the merge comes out the same either way. */
export const mergeRibbons = (a: readonly Ribbon[], b: readonly Ribbon[]): Ribbon[] => {
  const byDay = new Map<DayKey, Ribbon>()
  for (const r of [...a, ...b]) {
    const had = byDay.get(r.day)
    byDay.set(r.day, had ? better(had, r) : r)
  }
  return [...byDay.values()].sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0))
}

/** The save's `ribbons`: the valid ones, one per day. */
export const parseRibbons = (v: unknown): Ribbon[] => (Array.isArray(v) ? mergeRibbons([], v.flatMap((r) => parseRibbon(r) ?? [])) : [])

/** How many ribbons of each tier. */
export const ribbonCounts = (ribbons: readonly Pick<Ribbon, 'tier'>[]): Record<RibbonTier, number> => ({
  gold: ribbons.filter((r) => r.tier === 'gold').length,
  silver: ribbons.filter((r) => r.tier === 'silver').length,
  bronze: ribbons.filter((r) => r.tier === 'bronze').length,
})
