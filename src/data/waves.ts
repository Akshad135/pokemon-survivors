import type { EnemyId } from './enemies'

/**
 * Spawn director timeline. A stage is active until `until` seconds; `rate`
 * is spawns per second and `max` caps how many regular enemies live at once.
 */
export type WaveStage = {
  until: number
  rate: number
  max: number
  pool: ReadonlyArray<readonly [EnemyId, number]>
}

export type WaveEvent =
  | { at: number; kind: 'boss'; enemy: EnemyId }
  /** A flock crossing the screen in a straight line. */
  | { at: number; kind: 'swarm'; enemy: EnemyId; count: number }
  /** A closing circle around the player. */
  | { at: number; kind: 'ring'; enemy: EnemyId; count: number }

export const RUN_LENGTH = 15 * 60

export const STAGES: readonly WaveStage[] = [
  { until: 60, rate: 1.4, max: 40, pool: [['rattata', 5], ['caterpie', 4], ['pidgey', 3]] },
  { until: 120, rate: 2.2, max: 70, pool: [['rattata', 4], ['pidgey', 4], ['weedle', 4], ['spearow', 2]] },
  { until: 180, rate: 3, max: 100, pool: [['spearow', 3], ['ekans', 4], ['zubat', 3], ['oddish', 4]] },
  { until: 300, rate: 3.6, max: 130, pool: [['oddish', 3], ['paras', 4], ['venonat', 4], ['mankey', 2], ['zubat', 2]] },
  { until: 420, rate: 4.2, max: 160, pool: [['mankey', 4], ['machop', 3], ['geodude', 2], ['gastly', 3]] },
  { until: 600, rate: 5, max: 200, pool: [['gastly', 4], ['koffing', 3], ['machop', 4], ['venonat', 2], ['geodude', 2]] },
  { until: 780, rate: 6, max: 250, pool: [['machop', 4], ['geodude', 4], ['koffing', 4], ['mankey', 3], ['gastly', 3]] },
  { until: Infinity, rate: 7.5, max: 300, pool: [['geodude', 5], ['machop', 5], ['koffing', 4], ['gastly', 4]] },
]

export const EVENTS: readonly WaveEvent[] = [
  { at: 75, kind: 'swarm', enemy: 'pidgey', count: 16 },
  { at: 150, kind: 'swarm', enemy: 'zubat', count: 24 },
  { at: 240, kind: 'ring', enemy: 'oddish', count: 28 },
  { at: 300, kind: 'boss', enemy: 'onix' },
  { at: 390, kind: 'swarm', enemy: 'zubat', count: 36 },
  { at: 480, kind: 'ring', enemy: 'geodude', count: 30 },
  { at: 540, kind: 'swarm', enemy: 'spearow', count: 40 },
  { at: 600, kind: 'boss', enemy: 'snorlax' },
  { at: 720, kind: 'ring', enemy: 'gastly', count: 40 },
  { at: 810, kind: 'swarm', enemy: 'zubat', count: 60 },
  { at: RUN_LENGTH, kind: 'boss', enemy: 'mewtwo' },
]

export const stageAt = (time: number) => STAGES.find((s) => time < s.until) ?? STAGES[STAGES.length - 1]!

/** Regular enemies get tougher every minute; bosses keep their base stats. */
export const scaling = (time: number) => {
  const minutes = time / 60
  return { hp: 1 + minutes * 0.24 + Math.max(0, minutes - 8) * 0.25, damage: 1 + minutes * 0.07 }
}
