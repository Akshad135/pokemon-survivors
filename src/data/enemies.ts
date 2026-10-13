import { ROSTER, type Tier } from './roster'
import type { TraitId } from './traits'
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
  /** Behavior on top of chasing (healer, shield, summoner, kamikaze, beam, leaper). See `data/traits.ts`. */
  trait?: TraitId
  /** Integer draw scale (and body size) for Pokémon that must loom over the rest, like the reaper. */
  scale?: number
}

/**
 * Every enemy: the generated wild roster (`data/roster.ts`) plus the hand-tuned
 * bosses. An entry here with the same key as a roster species replaces it, and
 * any entry with a `tier` joins the horde draw.
 */
export const ENEMIES = {
  ...ROSTER,
  // Species with a behavior trait (`data/traits.ts`): hand-tuned, with the tier matching when they used to show up.
  voltorb: { dex: 100, name: 'Voltorb', types: ['electric'], hp: 20, speed: 50, damage: 9, xp: 2, mass: 0.9, trait: 'kamikaze', tier: 2 },
  electrode: { dex: 101, name: 'Electrode', types: ['electric'], hp: 42, speed: 62, damage: 12, xp: 4, mass: 1, trait: 'kamikaze', tier: 5 },
  magnemite: { dex: 81, name: 'Magnemite', types: ['electric', 'steel'], hp: 26, speed: 34, damage: 8, xp: 3, mass: 1, trait: 'beam', tier: 2 },
  chansey: { dex: 113, name: 'Chansey', types: ['normal'], hp: 70, speed: 26, damage: 6, xp: 5, mass: 1.8, trait: 'healer', tier: 3 },
  hitmonlee: { dex: 106, name: 'Hitmonlee', types: ['fighting'], hp: 50, speed: 40, damage: 12, xp: 4, mass: 1.4, trait: 'leaper', tier: 3 },
  bronzong: { dex: 437, name: 'Bronzong', types: ['steel', 'psychic'], hp: 80, speed: 24, damage: 10, xp: 6, mass: 2.8, trait: 'shield', tier: 4 },
  nidoqueen: { dex: 31, name: 'Nidoqueen', types: ['poison', 'ground'], hp: 110, speed: 28, damage: 14, xp: 8, mass: 2.4, trait: 'summoner', tier: 5 },
  nidoranF: { dex: 29, name: 'Nidoran♀', types: ['poison'], hp: 16, speed: 46, damage: 6, xp: 1, mass: 0.9 },
  nidoranM: { dex: 32, name: 'Nidoran♂', types: ['poison'], hp: 16, speed: 48, damage: 7, xp: 1, mass: 0.9 },
  onix: { dex: 95, name: 'Onix', types: ['rock', 'ground'], hp: 1100, speed: 36, damage: 18, xp: 50, mass: 20, boss: true },
  snorlax: { dex: 143, name: 'Snorlax', types: ['normal'], hp: 2800, speed: 30, damage: 24, xp: 90, mass: 30, boss: true },
  articuno: { dex: 144, name: 'Articuno', types: ['ice', 'flying'], hp: 5200, speed: 46, damage: 26, xp: 150, mass: 30, boss: true, legendary: true },
  zapdos: { dex: 145, name: 'Zapdos', types: ['electric', 'flying'], hp: 8000, speed: 50, damage: 30, xp: 200, mass: 30, boss: true, legendary: true },
  moltres: { dex: 146, name: 'Moltres', types: ['fire', 'flying'], hp: 11500, speed: 54, damage: 34, xp: 250, mass: 30, boss: true, legendary: true },
  mew: { dex: 151, name: 'Mew', types: ['psychic'], hp: 9000, speed: 70, damage: 30, xp: 300, mass: 40, boss: true, legendary: true },
  mewtwo: { dex: 150, name: 'Mewtwo', types: ['psychic'], hp: 22000, speed: 62, damage: 45, xp: 0, mass: 50, boss: true, legendary: true },
  // Rift legendaries (`data/rifts.ts`): HP and contact damage are their 3:30 values, scaled by `riftScale`.
  lugia: { dex: 249, name: 'Lugia', types: ['psychic', 'flying'], hp: 3400, speed: 56, damage: 28, xp: 0, mass: 40, boss: true, legendary: true },
  hoOh: { dex: 250, name: 'Ho-Oh', types: ['fire', 'flying'], hp: 3400, speed: 56, damage: 30, xp: 0, mass: 40, boss: true, legendary: true },
  kyogre: { dex: 382, name: 'Kyogre', types: ['water'], hp: 3800, speed: 44, damage: 28, xp: 0, mass: 40, boss: true, legendary: true },
  groudon: { dex: 383, name: 'Groudon', types: ['ground'], hp: 4200, speed: 38, damage: 32, xp: 0, mass: 40, boss: true, legendary: true },
  rayquaza: { dex: 384, name: 'Rayquaza', types: ['dragon', 'flying'], hp: 3000, speed: 66, damage: 30, xp: 0, mass: 40, boss: true, legendary: true },
  dialga: { dex: 483, name: 'Dialga', types: ['steel', 'dragon'], hp: 3600, speed: 46, damage: 30, xp: 0, mass: 40, boss: true, legendary: true },
  // The endless mode's reaper (`game/endless.ts`): it hunts the player from 20:00.
  arceus: { dex: 493, name: 'Arceus', types: ['normal'], hp: 300000, speed: 60, damage: 90, xp: 0, mass: 999, boss: true, legendary: true, scale: 2 },
} as const satisfies Record<string, EnemyDef>

export type EnemyId = keyof typeof ENEMIES
