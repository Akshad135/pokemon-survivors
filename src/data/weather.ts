import type { WeatherId } from './biomes'
import type { PokeType } from './types'

export type WeatherDef = {
  /** Damage multiplier by attacking type, for the player's moves and enemy attacks alike. */
  power?: Partial<Record<PokeType, number>>
  /** Wears down everyone (player and enemies) who has none of these types. */
  chip?: { immune: readonly PokeType[] }
  /** Fog: radius of the clear circle around the player, as a fraction of the view's shorter side. */
  sight?: number
  /** HUD/toast tint. */
  color: string
}

/**
 * Weather rules, inspired by the handheld games. The weakened type drops to
 * 0.75 rather than the games' 0.5, like the softened type chart: a whole minute
 * at half damage would sink a Fire or Water starter instead of challenging it.
 * Visuals live in `render/weather.ts`.
 */
export const WEATHER: Readonly<Record<WeatherId, WeatherDef>> = {
  clear: { color: '#ffffff' },
  sun: { power: { fire: 1.5, water: 0.75 }, color: '#f8b030' },
  rain: { power: { water: 1.5, fire: 0.75 }, color: '#6890f0' },
  sand: { chip: { immune: ['rock', 'ground', 'steel'] }, color: '#d8b060' },
  snow: { chip: { immune: ['ice'] }, color: '#a8d8f8' },
  fog: { sight: 0.42, color: '#b8b0c8' },
}

/**
 * Sandstorm/snow wear: every `every` seconds, non-immune enemies lose `enemy`
 * of their max HP (`boss` for bosses) and the player loses `player`. The wear
 * never takes the player below `playerFloor` of their max HP, so it pressures
 * without ever finishing a run on its own.
 */
export const WEATHER_CHIP = { every: 2.5, enemy: 0.04, boss: 0.005, player: 0.012, playerFloor: 0.3 } as const
