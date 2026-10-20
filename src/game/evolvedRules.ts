import * as dm from '../engine/dmath'
import { STATUS_RULES, type StatusSpec } from './status'
import type { Visual } from './types'

/**
 * Pure rules behind some evolved moves (`evolvedMoves.ts` casts them): Tri
 * Attack's elements and Thunderbolt's forking current. Free of game state,
 * so they can be tested on their own.
 */

/** Tri Attack's three elements, in firing order: each beam inflicts its own condition. */
export const TRI_ELEMENTS = [
  { visual: 'triFire', status: { kind: 'burn', chance: 0.3, duration: 2.5, power: 0.35 } },
  { visual: 'triIce', status: { kind: 'slow', chance: 0.6, duration: 1.6, power: 0.6 } },
  { visual: 'triBolt', status: { kind: 'paralysis', chance: 0.25, duration: 1.6, power: 0 } },
] as const satisfies ReadonlyArray<{ visual: Visual; status: StatusSpec }>

/**
 * A sibling of a move's scaled status: `spec` gets the chance bonus, duration
 * scale and DoT boost that the move's own `base` status got from upgrades and items.
 */
export const siblingStatus = (scaled: StatusSpec | null, base: StatusSpec, spec: StatusSpec): StatusSpec => {
  if (!scaled) return spec
  return {
    kind: spec.kind,
    chance: Math.min(1, spec.chance + scaled.chance - base.chance),
    duration: spec.duration * (scaled.duration / base.duration),
    power: STATUS_RULES[spec.kind].dot && base.power > 0 ? spec.power * (scaled.power / base.power) : spec.power,
  }
}

type Foe = { id: number; x: number; y: number; dying: number }
export type Fork<T> = { foe: T; parent: number; depth: number }

/** Nearest living foe to `at` within `reach` that isn't in `taken`; ties go to the lower id. */
const nearestFree = <T extends Foe>(foes: readonly T[], at: { x: number; y: number }, reach: number, taken: ReadonlySet<T>) => {
  let best: T | null = null
  let bestD = reach * reach
  for (const e of foes) {
    if (e.dying >= 0 || taken.has(e)) continue
    const d = dm.sq(e.x - at.x) + dm.sq(e.y - at.y)
    if (d > bestD || (d === bestD && best && e.id > best.id)) continue
    best = e
    bestD = d
  }
  return best
}

/**
 * Up to `count` foes a forking current reaches, breadth first: the nearest
 * to `from` within `range`, then each struck foe passes it on to its
 * `branches` nearest unstruck foes within `jump`. `parent` indexes the foe it
 * came from (-1 for the first) and `depth` counts the jumps.
 */
export const forkTargets = <T extends Foe>(foes: readonly T[], from: { x: number; y: number }, count: number, range: number, jump: number, branches = 2): Fork<T>[] => {
  const taken = new Set<T>()
  const first = count > 0 ? nearestFree(foes, from, range, taken) : null
  if (!first) return []
  taken.add(first)
  const out: Fork<T>[] = [{ foe: first, parent: -1, depth: 0 }]
  for (let i = 0; i < out.length && out.length < count; i++) {
    for (let b = 0; b < branches && out.length < count; b++) {
      const next = nearestFree(foes, out[i]!.foe, jump, taken)
      if (!next) break
      taken.add(next)
      out.push({ foe: next, parent: i, depth: out[i]!.depth + 1 })
    }
  }
  return out
}
