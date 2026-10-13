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
  /** `chance` (0..1) makes the boss a rare appearance; omitted = always. */
  | { at: number; kind: 'boss'; enemy: EnemyId; chance?: number }
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
  { until: 780, rate: 6, max: 250, cast: [3, 4, 4, 4, 5], fresh: 2 },
  { until: Infinity, rate: 7.5, max: 300, cast: [4, 4, 5, 5], fresh: 2 },
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
  { at: RUN_LENGTH, kind: 'boss', enemy: 'mewtwo' },
]

/** Index into `STAGES` of the stage active at `time`. */
export const stageIndexAt = (time: number) => {
  const i = STAGES.findIndex((s) => time < s.until)
  return i < 0 ? STAGES.length - 1 : i
}

/** Run time (seconds) a stage starts at. */
export const stageStart = (index: number) => STAGES[index - 1]?.until ?? 0

export const stageAt = (time: number) => STAGES[stageIndexAt(time)]!

/** Regular enemies get tougher every minute; bosses keep their base stats. */
export const scaling = (time: number) => {
  const minutes = time / 60
  return { hp: 1 + minutes * 0.24 + Math.max(0, minutes - 8) * 0.25, damage: 1 + minutes * 0.07 }
}
