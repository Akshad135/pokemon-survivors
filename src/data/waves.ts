import type { EnemyId } from './enemies'
import type { Tier } from './roster'

/**
 * Spawn director timeline. A stage is active until `until` seconds; `rate`
 * is spawns per second and `max` caps how many regular enemies live at once.
 * Its species are drawn when the run starts (`game/roster.ts`): one per slot
 * in `cast`, from that slot's tier. Only `fresh` slots bring species new to the
 * run; the others keep the newest species of the previous stage when the tiers
 * match, so each stage introduces a couple of faces instead of a whole new horde.
 */
export type WaveStage = {
  until: number
  rate: number
  max: number
  cast: readonly Tier[]
  fresh: number
}

export type WaveEvent =
  /**
   * `chance` (0..1) makes the boss a rare appearance; omitted = always.
   * `finale`: the climax (Mewtwo). It blasts the horde back on arrival and thins
   * the regular spawns while it lives (`FINALE`), so the fight is about its attacks.
   */
  | { at: number; kind: 'boss'; enemy: EnemyId; chance?: number; finale?: true }
  /** A flock crossing the screen in a straight line: a flyer of `tier` from the run's horde. */
  | { at: number; kind: 'swarm'; tier: Tier; count: number }
  /** A closing circle around the player: a species of `tier` from the run's horde. */
  | { at: number; kind: 'ring'; tier: Tier; count: number }
  /** A closing circle of one fixed species, drawn or not (the Voltorb ring). */
  | { at: number; kind: 'ring'; enemy: EnemyId; count: number }

export const RUN_LENGTH = 15 * 60

export const STAGES: readonly WaveStage[] = [
  { until: 60, rate: 1.4, max: 40, cast: [1, 1, 1], fresh: 3 },
  { until: 120, rate: 2.2, max: 70, cast: [1, 1, 1, 2], fresh: 2 },
  { until: 180, rate: 3, max: 100, cast: [1, 2, 2, 2], fresh: 2 },
  { until: 300, rate: 3.6, max: 130, cast: [1, 2, 2, 2, 3], fresh: 2 },
  { until: 420, rate: 4.2, max: 160, cast: [2, 3, 3, 3, 3], fresh: 3 },
  { until: 600, rate: 5, max: 200, cast: [3, 3, 4, 4], fresh: 2 },
  { until: 780, rate: 7, max: 250, cast: [3, 4, 4, 4, 5], fresh: 2 },
  { until: Infinity, rate: 9, max: 300, cast: [4, 4, 5, 5], fresh: 2 },
]

/** Sorted by `at`. Events sharing a time run in list order (the last boss gets the HP bar). */
export const EVENTS: readonly WaveEvent[] = [
  { at: 75, kind: 'swarm', tier: 1, count: 16 },
  { at: 150, kind: 'boss', enemy: 'onix' },
  { at: 165, kind: 'swarm', tier: 1, count: 24 },
  { at: 240, kind: 'ring', tier: 2, count: 28 },
  { at: 270, kind: 'ring', enemy: 'voltorb', count: 10 },
  { at: 300, kind: 'boss', enemy: 'snorlax' },
  { at: 390, kind: 'swarm', tier: 1, count: 36 },
  { at: 420, kind: 'boss', enemy: 'articuno' },
  { at: 480, kind: 'ring', tier: 3, count: 30 },
  { at: 540, kind: 'swarm', tier: 1, count: 40 },
  { at: 570, kind: 'boss', enemy: 'zapdos' },
  { at: 660, kind: 'ring', tier: 3, count: 40 },
  { at: 720, kind: 'boss', enemy: 'moltres' },
  { at: 810, kind: 'swarm', tier: 1, count: 60 },
  { at: RUN_LENGTH, kind: 'boss', enemy: 'mew', chance: 0.1 },
  { at: RUN_LENGTH, kind: 'boss', enemy: 'mewtwo', finale: true },
]

/**
 * While the finale boss lives in the regular run, regular spawns run at `rate`
 * of the stage's and the horde is capped at `max` of its usual size. `push` is
 * the knockback its arrival gives every regular enemy.
 */
export const FINALE = { rate: 0.2, max: 0.25, push: 1100 } as const

/** When the wave a boss belongs to arrives (its scheduled event), or null for bosses off the schedule (rifts, Arceus). */
export const bossWaveAt = (enemy: EnemyId) => EVENTS.find((e) => e.kind === 'boss' && e.enemy === enemy)?.at ?? null

/**
 * Each wave boss has until the next one: when a boss of the wave at `at`
 * arrives, an earlier wave's boss still around flees. Bosses of the same wave
 * (Mew and Mewtwo) stay together, and bosses off the schedule never flee.
 */
export const fleesFrom = (enemy: EnemyId, at: number) => {
  const own = bossWaveAt(enemy)
  return own !== null && own < at
}

/** Index into `STAGES` of the stage active at `time`. */
export const stageIndexAt = (time: number) => {
  const i = STAGES.findIndex((s) => time < s.until)
  return i < 0 ? STAGES.length - 1 : i
}

/** Run time (seconds) a stage starts at. */
export const stageStart = (index: number) => STAGES[index - 1]?.until ?? 0

export const stageAt = (time: number) => STAGES[stageIndexAt(time)]!

/**
 * Regular enemies get tougher every minute; bosses keep their base stats.
 * HP climbs faster after 8:00, when evolved moves sweep the screen, but only
 * so far that a horde sized for the minute still dies to them: late pressure
 * comes from spawn density, not sponges. `ramp` steepens the slope (the difficulty's `ramp`).
 */
export const scaling = (time: number, ramp = 1) => {
  const minutes = time / 60
  return { hp: 1 + (minutes * 0.24 + Math.max(0, minutes - 8) * 0.6) * ramp, damage: 1 + minutes * 0.07 * ramp }
}
