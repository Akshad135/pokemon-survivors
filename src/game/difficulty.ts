/**
 * Difficulty levels, picked on the starter select screen and remembered in the
 * save. Each one is a set of multipliers on top of the base run (`waves.ts`,
 * `data/enemies.ts`); Normal is the base run itself. The ranking keeps a board
 * per level, so a run records the one it was played on (`RunSummary`).
 */
export type DifficultyMods = {
  /** Enemy HP, bosses included. */
  enemyHp: number
  /** Every hit the player takes: bodies, boss attacks, traits, traps. */
  enemyDamage: number
  /** Regular spawns per second and how many can be alive at once. */
  spawnRate: number
  /** Slope of the per-minute toughening (`scaling`): above 1, late enemies outgrow the base run. */
  ramp: number
  /** Every heal: regen, berries, potions, fountains, evolving, rift loot. */
  healing: number
}

/**
 * Measured with a headless bot (see the PR that added them): late-game DPS
 * outgrows linear multipliers, so the flat HP boost carries most of the weight,
 * slowing the build from the start. Hard puts a player with a full Poké Mart
 * about where Normal puts a fresh one; Nightmare is meant to beat them often.
 */
export const DIFFICULTIES = {
  normal: { enemyHp: 1, enemyDamage: 1, spawnRate: 1, ramp: 1, healing: 1 },
  hard: { enemyHp: 2.5, enemyDamage: 1.25, spawnRate: 1.1, ramp: 1.15, healing: 1 },
  nightmare: { enemyHp: 3.5, enemyDamage: 1.5, spawnRate: 1.2, ramp: 1.3, healing: 0.5 },
} as const satisfies Record<string, DifficultyMods>

export type Difficulty = keyof typeof DIFFICULTIES

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[]

export const DEFAULT_DIFFICULTY: Difficulty = 'normal'

export const isDifficulty = (v: unknown): v is Difficulty => DIFFICULTY_IDS.some((id) => id === v)

/** A saved difficulty, or Normal when it's missing or unknown. */
export const parseDifficulty = (v: unknown): Difficulty => (isDifficulty(v) ? v : DEFAULT_DIFFICULTY)
