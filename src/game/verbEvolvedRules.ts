import * as dm from '../engine/dmath'

/**
 * Pure rules behind the evolved verb moves (`verbEvolutions.ts` casts them):
 * Water Spout's HP scaling, Electro Drift's spiral and its links, who Sky
 * Uppercut goes for, First Impression's zigzag, Thousand Arrows' targets and
 * how far an Explosion chain spreads. No game state is touched, so each is
 * tested on its own (`verbEvolvedRules.test.ts`).
 */

type Point = { x: number; y: number }
type Foe = { id: number; x: number; y: number; dying: number }

const d2 = (a: Point, b: Point) => dm.sq(a.x - b.x) + dm.sq(a.y - b.y)

/* ---------------- Water Spout ---------------- */

/** Water Spout's damage multiplier at empty and at full HP: the healthier the player, the harder it rains. */
export const SPOUT_MULT = { empty: 0.6, full: 1.25 } as const

/** Water Spout's multiplier for a player at `hp` share of their max HP (0..1, clamped). */
export const spoutMult = (hp: number) => SPOUT_MULT.empty + (SPOUT_MULT.full - SPOUT_MULT.empty) * Math.min(1, Math.max(0, hp))

/* ---------------- Electro Drift ---------------- */

/** Radius (px) an Electro Drift orb is at, `k` (0..1) into its life: it spirals out fast, then glides wide. */
export const driftRadius = (k: number, from: number, to: number) => {
  const t = Math.min(1, Math.max(0, k))
  return from + (to - from) * (1 - dm.sq(1 - t))
}

/** Distance from `p` to the segment `a`–`b` (the lightning between two orbs). */
export const segmentDistance = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const k = len2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return dm.hypot(p.x - (a.x + dx * k), p.y - (a.y + dy * k))
}

/** Pairs of orb indices the lightning joins: a chain for two orbs, a closed loop for three or more. */
export const driftLinks = (count: number): Array<readonly [number, number]> =>
  count < 2 ? [] : count === 2 ? [[0, 1]] : Array.from({ length: count }, (_, i) => [i, (i + 1) % count] as const)

/* ---------------- Sky Uppercut ---------------- */

type Tough = Foe & { hp: number; boss: boolean }

/** Sky Uppercut's picks: up to `count` living foes, bosses first, then the most HP left (ties to the lower id). */
export const toughest = <T extends Tough>(foes: readonly T[], count: number): T[] =>
  foes
    .filter((e) => e.dying < 0)
    .sort((a, b) => Number(b.boss) - Number(a.boss) || b.hp - a.hp || a.id - b.id)
    .slice(0, count)

/* ---------------- First Impression ---------------- */

export type Leg = { from: Point; to: Point }

/**
 * First Impression's zigzag from `start`: up to `count` legs, each through the
 * nearest living foe not hit yet within `length + seek` of where the last leg
 * ended, `overshoot` px past it (never longer than `length`). With no foe in
 * reach of the start it dashes its full length along `facing`.
 */
export const zigzagLegs = (
  start: Point, foes: readonly Foe[], count: number, o: { length: number; seek: number; overshoot: number; facing: Point },
): Leg[] => {
  const legs: Leg[] = []
  const taken = new Set<number>()
  let at = start
  const reach2 = dm.sq(o.length + o.seek)
  while (legs.length < count) {
    let best: Foe | null = null
    let bestD = Infinity
    for (const e of foes) {
      if (e.dying >= 0 || taken.has(e.id)) continue
      const d = d2(e, at)
      if (d > reach2 || d >= bestD) continue
      best = e
      bestD = d
    }
    if (!best) break
    taken.add(best.id)
    const d = Math.sqrt(bestD)
    const ux = d > 0 ? (best.x - at.x) / d : o.facing.x
    const uy = d > 0 ? (best.y - at.y) / d : o.facing.y
    const dist = Math.min(o.length, d + o.overshoot)
    const to = { x: at.x + ux * dist, y: at.y + uy * dist }
    legs.push({ from: at, to })
    at = to
  }
  if (legs.length === 0) legs.push({ from: start, to: { x: start.x + o.facing.x * o.length, y: start.y + o.facing.y * o.length } })
  return legs
}

/* ---------------- Thousand Arrows ---------------- */

/** `count` picks cycling through `targets` in order (fewer foes than arrows: some take two). */
export const cycle = <T>(targets: readonly T[], count: number): T[] =>
  targets.length === 0 ? [] : Array.from({ length: count }, (_, i) => targets[i % targets.length]!)

/* ---------------- Explosion ---------------- */

/**
 * How many foes a blast at chain `depth` may set off in turn: the Explosion
 * itself sets off up to 10 of the foes it faints, each of those 2, each of
 * those 1, and the chain stops there (at most 50 blasts a cast).
 */
export const CHAIN_KIDS = [10, 2, 1] as const

/** Blasts a blast at `depth` may set off (0 past the chain's end). */
export const chainKids = (depth: number) => CHAIN_KIDS[depth] ?? 0

/* ---------------- Lobs ---------------- */

/**
 * Where a foe chasing the player will be after `t` seconds: `speed × t` px
 * closer, never closer than `keep` px. Water Spout's drops and Thousand
 * Arrows aim there, so a slow lob still lands on a walking foe.
 */
export const leadOf = (e: Point & { speed: number }, to: Point, t: number, keep = 12): Point => {
  const d = dm.hypot(to.x - e.x, to.y - e.y)
  if (d <= keep) return { x: e.x, y: e.y }
  const step = Math.min(d - keep, e.speed * t)
  return { x: e.x + ((to.x - e.x) / d) * step, y: e.y + ((to.y - e.y) / d) * step }
}
