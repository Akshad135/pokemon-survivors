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
  onix: { dex: 95, name: 'Onix', types: ['rock', 'ground'], hp: 1600, speed: 36, damage: 20, xp: 60, mass: 20, boss: true },
  snorlax: { dex: 143, name: 'Snorlax', types: ['normal'], hp: 5200, speed: 30, damage: 30, xp: 120, mass: 30, boss: true },
  mewtwo: { dex: 150, name: 'Mewtwo', types: ['psychic'], hp: 22000, speed: 62, damage: 45, xp: 0, mass: 50, boss: true },
} as const satisfies Record<string, EnemyDef>

export type EnemyId = keyof typeof ENEMIES

export const ENEMY_DEX = Object.values(ENEMIES).map((e) => e.dex)
