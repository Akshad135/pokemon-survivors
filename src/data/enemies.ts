import { ROSTER, type Tier } from './roster'
import type { PokeType } from './types'

export type EnemyDef = {
  dex: number
  name: string
  types: readonly PokeType[]
  hp: number
  /** px/s */
  speed: number
  /** contact damage */
  damage: number
  xp: number
  /** knockback resistance; 1 = normal */
  mass: number
  boss?: boolean
  /** Legendary bosses get the big entrance (flash, banner) and attack patterns from `data/bosses.ts`. */
  legendary?: boolean
  /** Wild species with a tier can be drawn into a run's horde (see `game/roster.ts`); bosses have none. */
  tier?: Tier
}

/**
 * Every enemy: the generated wild roster (`data/roster.ts`) plus the hand-tuned
 * bosses. An entry here with the same key as a roster species replaces it, and
 * any entry with a `tier` joins the horde draw.
 */
export const ENEMIES = {
  ...ROSTER,
  onix: { dex: 95, name: 'Onix', types: ['rock', 'ground'], hp: 1100, speed: 36, damage: 18, xp: 50, mass: 20, boss: true },
  snorlax: { dex: 143, name: 'Snorlax', types: ['normal'], hp: 2800, speed: 30, damage: 24, xp: 90, mass: 30, boss: true },
  articuno: { dex: 144, name: 'Articuno', types: ['ice', 'flying'], hp: 5200, speed: 46, damage: 26, xp: 150, mass: 30, boss: true, legendary: true },
  zapdos: { dex: 145, name: 'Zapdos', types: ['electric', 'flying'], hp: 8000, speed: 50, damage: 30, xp: 200, mass: 30, boss: true, legendary: true },
  moltres: { dex: 146, name: 'Moltres', types: ['fire', 'flying'], hp: 11500, speed: 54, damage: 34, xp: 250, mass: 30, boss: true, legendary: true },
  mew: { dex: 151, name: 'Mew', types: ['psychic'], hp: 9000, speed: 70, damage: 30, xp: 300, mass: 40, boss: true, legendary: true },
  mewtwo: { dex: 150, name: 'Mewtwo', types: ['psychic'], hp: 22000, speed: 62, damage: 45, xp: 0, mass: 50, boss: true, legendary: true },
} as const satisfies Record<string, EnemyDef>

export type EnemyId = keyof typeof ENEMIES
