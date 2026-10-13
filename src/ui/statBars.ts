import type { PlayerStats } from '../game/stats'

/**
 * Stat bars of a starter sheet (the inspect panel and the site's Pokédex): label key,
 * value getter and the range mapped to an empty/full bar. Pure, so both can share it.
 */
export const STAT_BARS = [
  { label: 'hp', get: (s: PlayerStats) => s.maxHp, min: 50, max: 260, fmt: (v: number) => `${Math.round(v)}` },
  { label: 'attack', get: (s: PlayerStats) => s.might, min: 0.8, max: 1.5, fmt: (v: number) => `x${v.toFixed(2)}` },
  { label: 'defense', get: (s: PlayerStats) => s.armor, min: 0, max: 5, fmt: (v: number) => `${v}` },
  { label: 'speed', get: (s: PlayerStats) => s.speed, min: 50, max: 95, fmt: (v: number) => `${Math.round(v)}` },
  { label: 'cooldown', get: (s: PlayerStats) => 1 / s.cooldown, min: 0.9, max: 1.2, fmt: (v: number) => `x${(1 / v).toFixed(2)}` },
  { label: 'area', get: (s: PlayerStats) => s.area, min: 0.9, max: 1.45, fmt: (v: number) => `x${v.toFixed(2)}` },
  { label: 'regen', get: (s: PlayerStats) => s.regen, min: 0, max: 1.5, fmt: (v: number) => `${v.toFixed(1)}/s` },
] as const

/** How full a bar is (0.03..1), so even the lowest value shows a sliver. */
export const statRatio = (v: number, min: number, max: number) => Math.max(0.03, Math.min(1, (v - min) / (max - min)))
