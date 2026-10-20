import type { ArenaShape, Circle, FloorPlan, Pt } from '../data/arenas'
import type { ArenaTransform, LegendDomain, Threat } from '../data/domains'

/**
 * Pure rules of a legendary's domain (`data/domains.ts`): the threat's front,
 * the arena's transforms, the floor at each moment, and the timelines of the
 * encounter and capture scenes. `game/domain.ts` drives them.
 */

/**
 * The encounter scene, in seconds (the world holds still through it): the
 * camera settles, travels to the legendary, it makes its entrance and shows
 * itself (`reveal`, the title card), the camera holds on it, then comes back.
 */
export const ENCOUNTER = { settle: 0.5, pan: 1.3, rise: 1.2, hold: 2, back: 1 } as const

/** When the legendary shows itself in the encounter (its cry, the flash, the title card). */
export const REVEAL_AT = ENCOUNTER.settle + ENCOUNTER.pan + ENCOUNTER.rise
export const ENCOUNTER_LENGTH = REVEAL_AT + ENCOUNTER.hold + ENCOUNTER.back

/**
 * The capture scene, in seconds: the legendary kneels (`kneel`), the Poké
 * Ball flies (`throw`), takes it in (`absorb`), drops, shakes `shakes` times
 * `shake` s apart, and settles at `settle` (caught or broken out,
 * `render/capture.ts`); the loot drops at `length`.
 */
export const CAPTURE = { kneel: 0.9, throw: 0.7, absorb: 0.5, drop: 0.4, shakes: 3, shake: 0.8, settle: 5.2, length: 6.7 } as const

const smooth = (k: number) => {
  const c = Math.min(1, Math.max(0, k))
  return c * c * (3 - 2 * c)
}

/** Where the encounter is at `t` s: how far the camera has traveled to the legendary (0..1), and how far its entrance has played (0..1). */
export const encounterBeat = (t: number) => {
  const travel = smooth((t - ENCOUNTER.settle) / ENCOUNTER.pan)
  const back = smooth((t - REVEAL_AT - ENCOUNTER.hold) / ENCOUNTER.back)
  return { camera: travel * (1 - back), entrance: Math.min(1, Math.max(0, (t - ENCOUNTER.settle - ENCOUNTER.pan) / ENCOUNTER.rise)) }
}

/**
 * The threat's front after `dt` s, `age` s into the crossing: still for its
 * `delay`, then rising north (toward smaller y) at its speed, `rush` times
 * faster while it trails the player (at `playerY`) by more than `gap` px; it
 * never passes `stop`.
 */
export const advanceFront = (front: number, playerY: number, age: number, dt: number, t: Threat) => {
  if (age < t.delay) return front
  const speed = front - playerY > t.gap ? t.speed * t.rush : t.speed
  return Math.max(t.stop, front - speed * dt)
}

/** Where a transform is `age` s into its phase: not shown yet, warning (blinking), or landed. */
export const transformStage = (t: ArenaTransform, age: number) => (age < t.at ? 'hidden' : age < t.at + t.warn ? 'warn' : 'landed')

const shiftShape = <S extends ArenaShape>(s: S, dx: number, dy: number): S =>
  s.kind === 'circle' ? { ...s, x: s.x + dx, y: s.y + dy } : { ...s, pts: s.pts.map(([x, y]): Pt => [x + dx, y + dy]) }

const shiftAll = <S extends ArenaShape>(list: readonly S[] | undefined, [dx, dy]: Pt) => (list ?? []).map((s) => shiftShape(s, dx, dy))

/**
 * The domain's floor, in domain px: while the way is open, the crossing and
 * the arena; once sealed, the arena alone with the transforms that landed (a
 * flood's water and islands, lava and its cool spots, crumbled holes; a later
 * transform of a kind replaces the earlier one's spare spots). Lava rivers
 * and their bridges come along like the floor. `water` adds a stretch of
 * shallow water (the tide behind its front).
 */
export const composePlan = (domain: LegendDomain, sealed: boolean, landed: readonly ArenaTransform[], water?: ArenaShape): FloorPlan => {
  const { arena, crossing } = domain
  const at = arena.at
  const last = (kind: ArenaTransform['kind']) => landed.filter((t) => t.kind === kind).at(-1)
  const flood = last('flood')
  const lava = last('lava')
  const holes: Circle[] = [...shiftAll(arena.holes, at), ...landed.flatMap((t) => (t.kind === 'crumble' ? shiftAll(t.spare, at) : []))]
  const shallow: ArenaShape[] = [...shiftAll(arena.shallow, at), ...landed.flatMap((t) => (t.kind === 'flood' ? shiftAll(t.area, at) : []))]
  const islands: Circle[] = [...shiftAll(arena.islands, at), ...(flood ? shiftAll(flood.spare, at) : [])]
  const lavaFields: ArenaShape[] = landed.flatMap((t) => (t.kind === 'lava' ? shiftAll(t.area, at) : []))
  const plan: FloorPlan = {
    floor: sealed ? shiftAll(arena.floor, at) : [...crossing.floor, ...shiftAll(arena.floor, at)],
    holes: sealed ? holes : [...(crossing.holes ?? []), ...holes],
    shallow: [...(sealed ? [] : (crossing.shallow ?? [])), ...shallow, ...(water ? [water] : [])],
    islands: [...(sealed ? [] : (crossing.islands ?? [])), ...islands],
    lavaFields,
    cool: lava ? shiftAll(lava.spare, at) : [],
    lava: [...(sealed ? [] : (crossing.lava ?? [])), ...(arena.lava ?? []).map((r) => ({ ...r, pts: r.pts.map(([x, y]): Pt => [x + at[0], y + at[1]]) }))],
    bridges: [...(sealed ? [] : (crossing.bridges ?? [])), ...(arena.bridges ?? []).map((b) => ({ ...b, x: b.x + at[0], y: b.y + at[1] }))],
  }
  return plan
}

/** The tide behind a front at domain y `front`: a band as wide as the domain, down past its south end. */
export const waterBelow = (front: number): ArenaShape => ({ kind: 'poly', pts: [[-2000, front], [2000, front], [2000, front + 4000], [-2000, front + 4000]] })

/** What a threat leaves behind its front at domain y `front`: the tide's water (`waterBelow`), or nothing when its `ground` is `none`. */
export const threatGround = (t: Threat, front: number) => (t.ground === 'none' ? undefined : waterBelow(front))
