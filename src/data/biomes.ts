import type { ThemeId } from './music'
import type { PokeType } from './types'
import { RUN_LENGTH } from './waves'

/** Weather that can roll in a biome. `clear` is the absence of weather. */
export const WEATHER_IDS = ['clear', 'sun', 'rain', 'sand', 'snow', 'fog'] as const
export type WeatherId = (typeof WEATHER_IDS)[number]

export type BiomeDef = {
  /**
   * Types that feel at home here. `biomeWeight` (`game/roster.ts`) makes new
   * species of these types likelier in the stages played here (forest →
   * grass/bug), so the horde matches the scenery.
   */
  affinity: readonly PokeType[]
  /** Relative odds of each weather spell while in this biome (missing = never). */
  weather: Partial<Record<WeatherId, number>>
  /** Run theme while no boss is alive. */
  theme: ThemeId
}

/**
 * The places a run walks through, in order. Visuals live in `render/world.ts`
 * and `render/props.ts`; names in `i18n` (`world.biomes`).
 */
export const BIOMES = {
  meadow: { affinity: ['normal', 'flying', 'bug', 'grass'], weather: { clear: 5, sun: 3, rain: 2 }, theme: 'run' },
  forest: { affinity: ['grass', 'bug', 'poison'], weather: { clear: 3, rain: 4, fog: 2, sun: 1 }, theme: 'forest' },
  cave: { affinity: ['rock', 'ground', 'fighting', 'poison'], weather: { clear: 3, sand: 4, fog: 1 }, theme: 'cave' },
  snow: { affinity: ['ice', 'water', 'flying'], weather: { clear: 2, snow: 5, fog: 1 }, theme: 'snow' },
  tower: { affinity: ['ghost', 'psychic', 'dark', 'poison'], weather: { clear: 2, fog: 5, rain: 2 }, theme: 'tower' },
} as const satisfies Record<string, BiomeDef>

export type BiomeId = keyof typeof BIOMES

/** Biomes in run order, each lasting an equal slice of the run. The last one holds until the end. */
export const BIOME_ORDER = ['meadow', 'forest', 'cave', 'snow', 'tower'] as const satisfies readonly BiomeId[]

export const BIOME_LENGTH = RUN_LENGTH / BIOME_ORDER.length

/** Biome scheduled at run time `time` (seconds). */
export const biomeAt = (time: number): BiomeId =>
  BIOME_ORDER[Math.min(BIOME_ORDER.length - 1, Math.max(0, Math.floor(time / BIOME_LENGTH)))]!

/** Seconds of clear sky at the start of a run, before the first weather roll. */
export const FIRST_WEATHER = 40

/** How long one weather spell (or a clear spell) lasts, in seconds. */
export const WEATHER_SPELL = { min: 50, max: 85 } as const
