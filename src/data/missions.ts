import type { BagItem } from '../game/bag'
import type { EggTier } from '../game/eggs'
import type { BiomeId, WeatherId } from './biomes'
import type { PokeType } from './types'

/**
 * What a mission asks for, measured on a run summary (`game/tally.ts`).
 * Most goals add up across the day's (or week's) runs; `survive`, `level`,
 * `endless` and `species` keep the best single run (see `BEST_GOALS` in
 * `game/missions.ts`). `hatches` counts eggs hatched, outside runs.
 */
export type MissionGoal =
  | { kind: 'kills' }
  | { kind: 'typeKills'; type: PokeType }
  | { kind: 'weatherKills'; weather: Exclude<WeatherId, 'clear'> }
  | { kind: 'biomeKills'; biome: BiomeId }
  | { kind: 'traitKills' }
  | { kind: 'shinyKills' }
  /** Pokémon of the day's outbreak (`game/outbreak.ts`). */
  | { kind: 'outbreakKills' }
  | { kind: 'bossKills' }
  | { kind: 'rifts' }
  | { kind: 'chests' }
  | { kind: 'meowths' }
  | { kind: 'altars' }
  | { kind: 'coins' }
  | { kind: 'moveEvolutions' }
  /** Beat Mewtwo, optionally with a starter of `type`. */
  | { kind: 'wins'; type?: PokeType }
  /** Minutes survived in one run, optionally with a starter of `type`. */
  | { kind: 'survive'; type?: PokeType }
  | { kind: 'level' }
  /** Endless minutes past Mewtwo in one run. */
  | { kind: 'endless' }
  /** Steps walked (they also walk the incubator's eggs). */
  | { kind: 'steps' }
  /** Different species seen in one run (logged in the Pokédex). */
  | { kind: 'species' }
  | { kind: 'hatches' }

/** Target and ₽ reward of one difficulty. */
type Tier = readonly [target: number, reward: number]

/** A family of missions: the draw picks one goal and one tier. `egg` and `item` (one, into the bag) are given on top of the ₽. */
export type MissionTemplate = { goals: readonly MissionGoal[]; tiers: readonly Tier[]; egg?: EggTier; item?: BagItem }

/** Types common enough in the wild roster to hunt in a day. */
const HUNTED_TYPES = ['normal', 'flying', 'bug', 'poison', 'fighting', 'ground', 'ghost', 'dark', 'dragon', 'rock', 'electric', 'steel', 'fire'] as const satisfies readonly PokeType[]
/** The starter trios' types. */
const STARTER_TYPES = ['grass', 'fire', 'water'] as const satisfies readonly PokeType[]
const WEATHERS = ['sun', 'rain', 'sand', 'snow', 'fog'] as const satisfies readonly WeatherId[]
const LATE_BIOMES = ['forest', 'cave', 'snow', 'tower'] as const satisfies readonly BiomeId[]

const typeKills = HUNTED_TYPES.map((type) => ({ kind: 'typeKills', type }) as const)

/** Targets of the daily outbreak mission: about a third and two thirds of what a full run defeats of it. */
const OUTBREAK_TIERS = [150, 300] as const

/** Three of these are drawn every day, one per template. */
export const DAILY_POOL = [
  { goals: [{ kind: 'kills' }], tiers: [[500, 100], [1000, 200]] },
  { goals: typeKills, tiers: [[80, 150], [150, 250]] },
  { goals: WEATHERS.map((weather) => ({ kind: 'weatherKills', weather })), tiers: [[60, 150], [120, 250]] },
  { goals: LATE_BIOMES.map((biome) => ({ kind: 'biomeKills', biome })), tiers: [[100, 150], [200, 250]] },
  { goals: STARTER_TYPES.map((type) => ({ kind: 'survive', type })), tiers: [[5, 100], [8, 200], [10, 300]] },
  { goals: [{ kind: 'traitKills' }], tiers: [[15, 150], [30, 250]] },
  { goals: [{ kind: 'bossKills' }], tiers: [[2, 150], [4, 250]] },
  { goals: [{ kind: 'chests' }], tiers: [[1, 150], [2, 250]] },
  { goals: [{ kind: 'meowths' }], tiers: [[1, 200]] },
  { goals: [{ kind: 'altars' }], tiers: [[2, 150], [3, 200]] },
  { goals: [{ kind: 'coins' }], tiers: [[400, 150], [1000, 250]] },
  { goals: [{ kind: 'rifts' }], tiers: [[1, 250]] },
  { goals: [{ kind: 'shinyKills' }], tiers: [[1, 250]], item: 'lure' },
  { goals: [{ kind: 'outbreakKills' }], tiers: [[OUTBREAK_TIERS[0], 150], [OUTBREAK_TIERS[1], 250]], item: 'lure' },
  { goals: [{ kind: 'level' }], tiers: [[20, 150], [30, 250]] },
  { goals: [{ kind: 'moveEvolutions' }], tiers: [[1, 200]] },
  { goals: [{ kind: 'steps' }], tiers: [[1500, 150], [3000, 250]] },
  { goals: [{ kind: 'species' }], tiers: [[12, 150], [20, 250]], item: 'incense' },
] as const satisfies readonly MissionTemplate[]

/** Two of these are drawn every week (weeks start on Monday). */
export const WEEKLY_POOL = [
  { goals: [{ kind: 'wins' }, ...STARTER_TYPES.map((type) => ({ kind: 'wins', type }) as const)], tiers: [[1, 1500], [3, 3000]], egg: 'rare' },
  { goals: [{ kind: 'rifts' }], tiers: [[3, 1200], [6, 2000]] },
  { goals: [{ kind: 'shinyKills' }], tiers: [[5, 1200], [10, 2000]], item: 'lure' },
  { goals: [{ kind: 'kills' }], tiers: [[5000, 1000], [10_000, 2000]] },
  { goals: typeKills, tiers: [[600, 1200], [1000, 2000]] },
  { goals: [{ kind: 'coins' }], tiers: [[5000, 1200], [10_000, 2000]] },
  { goals: [{ kind: 'chests' }, { kind: 'meowths' }], tiers: [[5, 1500]] },
  { goals: [{ kind: 'bossKills' }], tiers: [[15, 1200], [25, 2000]], item: 'incense' },
  { goals: [{ kind: 'endless' }], tiers: [[3, 1500], [6, 2500]] },
  { goals: [{ kind: 'hatches' }], tiers: [[1, 1000], [2, 1800]], egg: 'common' },
  { goals: [{ kind: 'steps' }], tiers: [[15_000, 1200], [25_000, 2000]] },
] as const satisfies readonly MissionTemplate[]

export const MISSION_SLOTS = { daily: 3, weekly: 2 } as const

export type MissionPeriod = keyof typeof MISSION_SLOTS
