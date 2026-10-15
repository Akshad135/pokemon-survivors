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
  /** How fast regular enemies walk (bosses keep their pace, their patterns are tuned to it). */
  enemySpeed: number
  /** Slope of the per-minute toughening (`scaling`): above 1, late enemies outgrow the base run. */
  ramp: number
  /** Every heal: regen, berries, potions, fountains, evolving, rift loot. */
  healing: number
}

/**
 * Harder levels press harder instead of soaking more hits: a crowd that walks
 * faster, spawns thicker and hits harder, and only about twice Normal's HP late
 * in the run (`enemyHp` × the steeper `ramp`), so the horde still melts under a
 * build that fits the minute. Measured with a headless bot: when Nightmare
 * leaned on HP (×3.5, ×4.5 Normal's late HP) the horde stopped dying, filled its
 * cap and buried Mewtwo in a blob nobody could reach.
 */
export const DIFFICULTIES = {
  normal: { enemyHp: 1, enemyDamage: 1, spawnRate: 1, enemySpeed: 1, ramp: 1, healing: 1 },
  hard: { enemyHp: 1.4, enemyDamage: 1.45, spawnRate: 1.25, enemySpeed: 1.1, ramp: 1.12, healing: 1 },
  nightmare: { enemyHp: 1.8, enemyDamage: 2, spawnRate: 1.5, enemySpeed: 1.2, ramp: 1.25, healing: 0.5 },
} as const satisfies Record<string, DifficultyMods>

export type Difficulty = keyof typeof DIFFICULTIES

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[]

export const DEFAULT_DIFFICULTY: Difficulty = 'normal'

export const isDifficulty = (v: unknown): v is Difficulty => DIFFICULTY_IDS.some((id) => id === v)

/** A saved difficulty, or Normal when it's missing or unknown. */
export const parseDifficulty = (v: unknown): Difficulty => (isDifficulty(v) ? v : DEFAULT_DIFFICULTY)
