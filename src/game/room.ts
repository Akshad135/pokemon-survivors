import type { ArenaShape, Circle, FloorPlan } from '../data/arenas'
import { keepOn } from './arenaFloor'
import type { Prop } from './props'
import type { Feature } from './terrain'
import type { Enemy, Game, Hazard, Pickup } from './types'

/**
 * A closed space the player steps into: a rift's arena (`riftArena.ts`) or a
 * place's interior (`placeInterior.ts`). Its floor plan is centered at (x, y)
 * in world px; while the player is inside, its floor and scenery take the map
 * terrain's place (`game/terrain.ts`) and the world waits outside, set aside
 * untouched (`setAside`, `bringBack`). The run clock keeps going.
 */
export type Room = { x: number; y: number; layout: FloorPlan; terrain: Feature }

/** The world outside, set aside untouched while the player is in a room. */
export type Stash = { enemies: Enemy[]; hazards: Hazard[]; pickups: Pickup[]; props: Prop[]; bossId: number | null }

/** The room the player is in, if any. */
export const roomOf = (g: Game): Room | null => g.rift.arena ?? g.place.inside

/** Seconds of invulnerability when stepping in or out, so nobody lands on a hit. */
export const ARRIVAL_IFRAMES = 1.5
/** The horde is pushed this far from the player when they come back. */
const EXIT_CLEARANCE = 64
/** A weather change that came due in a room waits this long after the way out, so it doesn't land on the loot's news. */
const EXIT_WEATHER_DELAY = 6

/** Sets the world aside (horde, hazards, pickups, props, the boss bar) and leaves the room empty for its own cast. */
export const setAside = (g: Game): Stash => {
  const stash = { enemies: g.enemies, hazards: g.hazards, pickups: g.pickups, props: g.props, bossId: g.bossId }
  g.enemies = []
  g.hazards = []
  g.pickups = []
  g.props = []
  g.bossId = null
  // Homing shots would keep chasing a target that is now set aside.
  for (const a of g.attacks) if (a.motion.kind === 'homing') a.motion.target = null
  g.player.iframes = Math.max(g.player.iframes, ARRIVAL_IFRAMES)
  return stash
}

/**
 * Puts the world back exactly as it was, around the player wherever they
 * stand now: the horde is pushed out of reach, and loot still flying toward
 * the player keeps flying.
 */
export const bringBack = (g: Game, stash: Stash) => {
  const p = g.player
  g.enemies = stash.enemies
  g.hazards = stash.hazards
  g.pickups = [...stash.pickups, ...g.pickups]
  g.props = stash.props
  g.bossId = stash.bossId
  for (const a of g.attacks) if (a.motion.kind === 'homing') a.motion.target = null
  for (const e of g.enemies) {
    if (e.dying >= 0) continue
    const dx = e.x - p.x
    const dy = e.y - p.y
    const d2 = dx * dx + dy * dy
    if (d2 >= EXIT_CLEARANCE * EXIT_CLEARANCE) continue
    const d = Math.sqrt(d2) || 1
    e.x = p.x + (dx / d) * EXIT_CLEARANCE
    e.y = p.y + (dy / d) * EXIT_CLEARANCE
  }
  p.iframes = Math.max(p.iframes, ARRIVAL_IFRAMES)
  g.weather.next = Math.max(g.weather.next, g.time + EXIT_WEATHER_DELAY)
}

/** Keeps a circle of radius `r` on a room's `floor` and out of its `holes` (world coordinates in, room coordinates for the geometry). */
export const keepOnFloor = (o: { x: number; y: number }, room: Room, floor: readonly ArenaShape[], holes: readonly Circle[], r: number) => {
  const local = { x: o.x - room.x, y: o.y - room.y }
  keepOn(floor, holes, local, r)
  o.x = room.x + local.x
  o.y = room.y + local.y
}
