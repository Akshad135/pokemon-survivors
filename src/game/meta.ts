import { chance, type Rng } from '../engine/rng'
import type { StatDelta } from './stats'
import type { Game } from './types'

/**
 * Meta progression: Poké Dollars (₽) earned across runs and the Poké Mart's
 * permanent upgrades. Everything here is pure; persistence lives in `ui/save.ts`.
 */

type UpgradeDef = {
  /** Official English name; descriptions live in `i18n`. */
  name: string
  maxRank: number
  /** Price of the first rank; later ranks grow by PRICE_GROWTH. */
  basePrice: number
  /** Either a stat bonus per rank or one extra per-run level-up charge per rank. */
  effect: { stat: StatDelta } | { charge: 'rerolls' | 'skips' }
}

export const UPGRADES = {
  hpUp: { name: 'HP Up', maxRank: 5, basePrice: 200, effect: { stat: { maxHp: 10 } } },
  protein: { name: 'Protein', maxRank: 5, basePrice: 300, effect: { stat: { might: 0.05 } } },
  iron: { name: 'Iron', maxRank: 3, basePrice: 400, effect: { stat: { armor: 1 } } },
  carbos: { name: 'Carbos', maxRank: 3, basePrice: 250, effect: { stat: { speed: 3.4 } } },
  calcium: { name: 'Calcium', maxRank: 3, basePrice: 300, effect: { stat: { area: 0.05 } } },
  zinc: { name: 'Zinc', maxRank: 3, basePrice: 450, effect: { stat: { cooldown: -0.025 } } },
  ppUp: { name: 'PP Up', maxRank: 1, basePrice: 3000, effect: { stat: { amount: 1 } } },
  expCharm: { name: 'Exp. Charm', maxRank: 5, basePrice: 250, effect: { stat: { growth: 0.03 } } },
  amuletCoin: { name: 'Amulet Coin', maxRank: 5, basePrice: 250, effect: { stat: { greed: 0.1 } } },
  abilityCapsule: { name: 'Ability Capsule', maxRank: 3, basePrice: 500, effect: { charge: 'rerolls' } },
  escapeRope: { name: 'Escape Rope', maxRank: 3, basePrice: 300, effect: { charge: 'skips' } },
} as const satisfies Record<string, UpgradeDef>

export type UpgradeId = keyof typeof UPGRADES

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[]

export type Ranks = Readonly<Record<UpgradeId, number>>

export const NO_RANKS: Ranks = Object.fromEntries(UPGRADE_IDS.map((id) => [id, 0])) as Record<UpgradeId, number>

/* ---------------- Prices ---------------- */

const PRICE_GROWTH = 1.6

/** Price of the next rank when `rank` ranks are already owned. Rounded to ₽10. */
export const upgradePrice = (id: UpgradeId, rank: number) => Math.round((UPGRADES[id].basePrice * PRICE_GROWTH ** rank) / 10) * 10

/** Everything spent on the given ranks, i.e. what a full refund gives back. */
export const totalSpent = (ranks: Ranks) =>
  UPGRADE_IDS.reduce((sum, id) => sum + Array.from({ length: ranks[id] }, (_, r) => upgradePrice(id, r)).reduce((a, b) => a + b, 0), 0)

/* ---------------- Applying ranks ---------------- */

/** One stat layer per owned rank (deltas are additive), ready for `applyDeltas`. */
export const rankDeltas = (ranks: Ranks): StatDelta[] =>
  UPGRADE_IDS.flatMap((id) => {
    const effect: UpgradeDef['effect'] = UPGRADES[id].effect
    return 'stat' in effect ? Array.from({ length: ranks[id] }, () => effect.stat) : []
  })

/** Level-up rerolls and skips a run starts with. */
export const runCharges = (ranks: Ranks) => ({ rerolls: ranks.abilityCapsule, skips: ranks.escapeRope })

/* ---------------- Save ---------------- */

export const SAVE_VERSION = 1

export type Save = { version: typeof SAVE_VERSION; wallet: number; ranks: Ranks }

export const EMPTY_SAVE: Save = { version: SAVE_VERSION, wallet: 0, ranks: NO_RANKS }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const wholeNumber = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0

/** Brings any older save shape up to the current version. Add a case per schema bump. */
const migrate = (data: Record<string, unknown>): Record<string, unknown> | null => {
  switch (data.version) {
    case SAVE_VERSION:
      return data
    default:
      return null
  }
}

/**
 * Parses raw `localStorage` text into a valid save. Never throws: corrupt JSON,
 * unknown versions or bad fields fall back to safe defaults, unknown upgrades
 * are dropped and ranks are clamped to each upgrade's max.
 */
export const parseSave = (raw: string | null): Save => {
  let json: unknown
  try {
    json = raw === null ? null : JSON.parse(raw)
  } catch {
    return EMPTY_SAVE
  }
  const data = isRecord(json) ? migrate(json) : null
  if (!data) return EMPTY_SAVE
  const ranks = isRecord(data.ranks) ? data.ranks : {}
  return {
    version: SAVE_VERSION,
    wallet: wholeNumber(data.wallet),
    ranks: Object.fromEntries(UPGRADE_IDS.map((id) => [id, wholeNumber(ranks[id], UPGRADES[id].maxRank)])) as Record<UpgradeId, number>,
  }
}

/* ---------------- Shop transactions ---------------- */

/** Buys the next rank of `id`, or returns null when maxed out or too expensive. */
export const buyUpgrade = (save: Save, id: UpgradeId): Save | null => {
  const rank = save.ranks[id]
  if (rank >= UPGRADES[id].maxRank) return null
  const price = upgradePrice(id, rank)
  if (save.wallet < price) return null
  return { ...save, wallet: save.wallet - price, ranks: { ...save.ranks, [id]: rank + 1 } }
}

/** Sells every rank back at full price. */
export const refundAll = (save: Save): Save => ({ ...save, wallet: save.wallet + totalSpent(save.ranks), ranks: NO_RANKS })

/* ---------------- Earning ₽ ---------------- */

/** Coin pickup values, from a single coin to a money bag. */
export const COIN_VALUES = [10, 50, 250] as const

export const coinTier = (value: number) => (value >= COIN_VALUES[2] ? 2 : value >= COIN_VALUES[1] ? 1 : 0)

/**
 * Coins dropped by a fainted enemy. Regular Pokémon drop one now and then
 * (tougher ones more often), shinies always pay out and bosses shower ₽.
 */
export const coinDrops = (rng: Rng, enemy: { boss: boolean; xp: number; shiny?: boolean }): number[] => {
  if (enemy.boss) return [250, 50, 50, 50, 50, 50]
  if (enemy.shiny) return [50, 50, 50]
  if (!chance(rng, 0.025 + enemy.xp * 0.01)) return []
  return [chance(rng, 0.1) ? 50 : 10]
}

/** End-of-run bonus for surviving and fainting foes, scaled by greed (Amulet Coin). */
export const runBonus = (run: { time: number; kills: number; victory: boolean; greed: number }) =>
  Math.round(((run.time / 60) * 30 + run.kills * 0.25 + (run.victory ? 1000 : 0)) * run.greed)

/** What a finished run pays out. Coins were already scaled by greed when collected. */
export const runEarnings = (g: Game) => {
  const bonus = runBonus({ time: g.time, kills: g.kills, victory: g.phase === 'victory', greed: g.player.stats.greed })
  return { coins: g.coins, bonus, total: g.coins + bonus }
}
