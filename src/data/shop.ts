import type { EggTier } from '../game/eggs'
import type { StatDelta } from '../game/stats'

/**
 * The Kecleon Shop's catalog, as data: the five shop levels a player invests
 * ₽ into, the Bag's consumables and the Vitrine do dia's pool. The rules that
 * read it live in `game/shop.ts` (the Vitrine, buying, investing) and
 * `game/bag.ts` (arming); what each consumable does in a run is its `effect`,
 * read by the simulation (`createGame`, `recomputeStats`, `tryMaxRevive`).
 * Item names stay in English (official); descriptions live in `i18n`.
 */

/** What a consumable does to the run that uses it. */
export type BagEffect =
  /** Wild shinies this many times likelier (the outbreak's too). */
  | { shinyOdds: number }
  /** Eggs this many times likelier to drop. */
  | { eggOdds: number }
  /** The run starts at this level: the level-ups in between come right after the opening draft. */
  | { startLevel: number }
  /** A stat layer for the whole run (`recomputeStats`). */
  | { stat: StatDelta }
  /** The day's outbreak species spawns this many times as often. */
  | { outbreakWeight: number }
  /** The first faint gets back up with this share of max HP, once. */
  | { revive: number }

type BagItemDef = {
  name: string
  /** Full price on the Vitrine, in ₽. */
  price: number
  /** How many one save may buy on a day. */
  stock: number
  /** How likely the day's free gift is this item, against the others' weights. */
  gift: number
  effect: BagEffect
}

/** The Bag's consumables, one of each armed per run at most. */
export const BAG_ITEMS = {
  lure: { name: 'Lure', price: 800, stock: 3, gift: 3, effect: { shinyOdds: 2 } },
  incense: { name: 'Incense', price: 600, stock: 3, gift: 3, effect: { eggOdds: 2 } },
  rareCandy: { name: 'Rare Candy', price: 1200, stock: 3, gift: 2, effect: { startLevel: 3 } },
  luckyEgg: { name: 'Lucky Egg', price: 1500, stock: 3, gift: 2, effect: { stat: { growth: 0.25 } } },
  luckIncense: { name: 'Luck Incense', price: 2000, stock: 2, gift: 1, effect: { stat: { greed: 0.5 } } },
  honey: { name: 'Honey', price: 700, stock: 3, gift: 3, effect: { outbreakWeight: 2 } },
  xAttack: { name: 'X Attack', price: 1500, stock: 3, gift: 2, effect: { stat: { might: 0.1 } } },
  maxRevive: { name: 'Max Revive', price: 5000, stock: 1, gift: 1, effect: { revive: 0.5 } },
} as const satisfies Record<string, BagItemDef>

export type BagItem = keyof typeof BAG_ITEMS

export const BAG_ITEM_IDS = Object.keys(BAG_ITEMS) as BagItem[]

type ShopLevelDef = {
  /** ₽ to reach this level from the one before (never refunded). */
  cost: number
  /** Cards on the Vitrine besides the deal. */
  vitrineSlots: number
  /** Different Bag items a run may take. */
  bagSlots: number
  /** TMs that can be armed at once (the TM shelf, PR 4). */
  armedTms: number
  /** Shelves this level has open: TMs from the Tent, evolution items and Bottle Caps from the Shop. */
  shelves: { tms: boolean; evolution: boolean; caps: boolean }
  /** Pin one Vitrine item and hear when it comes back. */
  wishlist: boolean
  /** The purple Kecleon tends the TM and evolution shelves. */
  brother: boolean
  /** Meowth's weekend caravan parks at the plaza (PR 5). */
  caravan: boolean
  /** The Tycoon title, the gold Kecleon frame and the golden statue (PR 5). */
  tycoon: boolean
  /** Props this level adds to the plaza (PR 2). */
  props: readonly ShopProp[]
}

export type ShopProp = 'board' | 'flowers' | 'lights' | 'statue'

const SHELVES_LV1 = { tms: false, evolution: false, caps: false } as const
const SHELVES_LV2 = { tms: true, evolution: false, caps: false } as const
const SHELVES_LV3 = { tms: true, evolution: true, caps: true } as const

/** The shop's levels, 1 (Cart) to 5 (Department Store); names live in `i18n` (`shop.levels`). */
export const SHOP_LEVELS = {
  1: { cost: 0, vitrineSlots: 4, bagSlots: 2, armedTms: 1, shelves: SHELVES_LV1, wishlist: false, brother: false, caravan: false, tycoon: false, props: [] },
  2: { cost: 30_000, vitrineSlots: 5, bagSlots: 3, armedTms: 1, shelves: SHELVES_LV2, wishlist: true, brother: true, caravan: false, tycoon: false, props: ['board'] },
  3: { cost: 100_000, vitrineSlots: 6, bagSlots: 3, armedTms: 1, shelves: SHELVES_LV3, wishlist: true, brother: true, caravan: false, tycoon: false, props: ['flowers'] },
  4: { cost: 300_000, vitrineSlots: 6, bagSlots: 4, armedTms: 2, shelves: SHELVES_LV3, wishlist: true, brother: true, caravan: true, tycoon: false, props: ['lights'] },
  5: { cost: 800_000, vitrineSlots: 7, bagSlots: 4, armedTms: 2, shelves: SHELVES_LV3, wishlist: true, brother: true, caravan: true, tycoon: true, props: ['statue'] },
} as const satisfies Record<number, ShopLevelDef>

export type ShopLevel = keyof typeof SHOP_LEVELS

export const SHOP_LEVEL_IDS = Object.keys(SHOP_LEVELS).map(Number) as ShopLevel[]

export const MAX_SHOP_LEVEL = SHOP_LEVEL_IDS[SHOP_LEVEL_IDS.length - 1]!

/** The most Bag items any level lets a run take: a replay with more is malformed (`parseReplay`). */
export const MAX_BAG_SLOTS = Math.max(...SHOP_LEVEL_IDS.map((l) => SHOP_LEVELS[l].bagSlots))

/**
 * The Vitrine do dia's pool: every consumable, the day's egg and the day's
 * style. A card's id is its key here; PR 4 adds TMs and evolution items by
 * adding keys (and their price and stock in `game/shop.ts`). Each day deals
 * `VITRINE.core` cards that every level sees (the deal first), the ones shown
 * longest ago first, so every card is back within 7 days even at Lv 1; that
 * needs the pool to fit in 7 days of core cards (`shop.test.ts` checks both).
 */
export const VITRINE_POOL = [...BAG_ITEM_IDS, 'egg', 'style'] as const

export type VitrineKey = (typeof VITRINE_POOL)[number]

export const VITRINE = {
  /** Cards every level sees: the deal and Lv 1's slots. The rotation guarantee rides on these. */
  core: 1 + SHOP_LEVELS[1].vitrineSlots,
  /** The deal (the first card) takes this much off. */
  deal: 0.3,
  /** Days of seeded nudge on how long ago each card showed, so the rotation mixes (0 would deal the same groups over and over). */
  jitter: 2.5,
  /** The rotation counts from this day (a Monday); earlier days start fresh. */
  epoch: '2026-10-19',
  /** The day's egg: each tier's price and its odds of being the day's (shown on screen). One per day. */
  eggs: {
    common: { price: 1500, weight: 60 },
    rare: { price: 4000, weight: 34 },
    ultra: { price: 9000, weight: 6 },
  },
  /** How many eggs and styles one save may buy on a day. */
  eggStock: 1,
  styleStock: 1,
} as const satisfies { eggs: Record<Exclude<EggTier, 'friend'>, { price: number; weight: number }> } & Record<string, unknown>

export type VitrineEgg = keyof typeof VITRINE.eggs
