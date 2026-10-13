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
  /** Integer draw scale (and body size) for Pokémon that must loom over the rest, like the reaper. */
  scale?: number
}

export const ENEMIES = {
  rattata: { dex: 19, name: 'Rattata', types: ['normal'], hp: 8, speed: 40, damage: 5, xp: 1, mass: 1 },
  caterpie: { dex: 10, name: 'Caterpie', types: ['bug'], hp: 10, speed: 26, damage: 4, xp: 1, mass: 1 },
  pidgey: { dex: 16, name: 'Pidgey', types: ['normal', 'flying'], hp: 9, speed: 44, damage: 5, xp: 1, mass: 0.8 },
  weedle: { dex: 13, name: 'Weedle', types: ['bug', 'poison'], hp: 14, speed: 28, damage: 6, xp: 1, mass: 1 },
  spearow: { dex: 21, name: 'Spearow', types: ['normal', 'flying'], hp: 14, speed: 52, damage: 7, xp: 2, mass: 0.8 },
  ekans: { dex: 23, name: 'Ekans', types: ['poison'], hp: 24, speed: 34, damage: 8, xp: 2, mass: 1.2 },
  zubat: { dex: 41, name: 'Zubat', types: ['poison', 'flying'], hp: 10, speed: 58, damage: 6, xp: 1, mass: 0.6 },
  oddish: { dex: 43, name: 'Oddish', types: ['grass', 'poison'], hp: 22, speed: 30, damage: 7, xp: 2, mass: 1 },
  paras: { dex: 46, name: 'Paras', types: ['bug', 'grass'], hp: 28, speed: 30, damage: 8, xp: 2, mass: 1.2 },
  venonat: { dex: 48, name: 'Venonat', types: ['bug', 'poison'], hp: 32, speed: 38, damage: 9, xp: 3, mass: 1.2 },
  mankey: { dex: 56, name: 'Mankey', types: ['fighting'], hp: 34, speed: 54, damage: 10, xp: 3, mass: 1 },
  gastly: { dex: 92, name: 'Gastly', types: ['ghost', 'poison'], hp: 36, speed: 46, damage: 10, xp: 3, mass: 0.7 },
  machop: { dex: 66, name: 'Machop', types: ['fighting'], hp: 58, speed: 36, damage: 12, xp: 4, mass: 1.6 },
  koffing: { dex: 109, name: 'Koffing', types: ['poison'], hp: 62, speed: 30, damage: 12, xp: 4, mass: 1.6 },
  geodude: { dex: 74, name: 'Geodude', types: ['rock', 'ground'], hp: 75, speed: 26, damage: 13, xp: 5, mass: 2.6 },
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

export const ENEMY_DEX = Object.values(ENEMIES).map((e) => e.dex)
