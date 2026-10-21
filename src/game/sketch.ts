import * as dm from '../engine/dmath'
import type { PokeType } from '../data/types'
import { burst } from './effects'
import { maxMoveLevel, MOVE_IDS, MOVES, moveStats, type MoveDef, type MoveId, type MoveStats } from './moves'
import { isAlive, nearestEnemy } from './queries'
import { spawnAttack } from './spawn'
import type { Enemy, Game, OwnedMove } from './types'

/**
 * Smeargle's signature, Sketch (the Kecleon Egg's one-stage family): its tail
 * paints a move off the foe nearest to it, a boss in reach first, and casts
 * that move for `SKETCH.casts` casts before it paints again. The move follows
 * the foe's first type (`SKETCH_COPY`); a boss lends its stronger one
 * (`SKETCH_BOSS`); with no foe in reach it paints from memory, a seeded pick.
 * The painted move hits at Sketch's level (or that move's max), scaled by its
 * damage like Metronome, and its hitboxes count as Sketch's. Spread at the end
 * of `MOVES`; drawn by `render/eggMoveFx.ts` (the brush and the bubble).
 *
 * This module only reads `moves.ts` at cast time (it is evaluated first).
 */

export const SKETCH = {
  /** Sketch's damage stat at which the painted move hits as hard as its own. */
  ref: 10,
  /** How close (px, before area) a foe must be for its move to be painted. */
  reach: 150,
  /** Casts a painting lasts before the tail paints anew. */
  casts: 3,
} as const

/** The move a foe of each type lends Sketch: a base move of that type. */
export const SKETCH_COPY = {
  normal: 'swift',
  fire: 'ember',
  water: 'waterGun',
  grass: 'razorLeaf',
  electric: 'thunder',
  ice: 'iceShard',
  fighting: 'dynamicPunch',
  poison: 'sludgeBomb',
  ground: 'earthquake',
  flying: 'gust',
  psychic: 'psyshock',
  bug: 'pinMissile',
  rock: 'rockTomb',
  ghost: 'spiritShackle',
  dragon: 'dragonBreath',
  dark: 'crunch',
  steel: 'flashCannon',
  fairy: 'disarmingVoice',
} as const satisfies Record<PokeType, MoveId>

/** What a boss of a type lends instead: an evolved move, where its type has one Metronome calls too. */
export const SKETCH_BOSS = {
  normal: 'triAttack',
  fire: 'flamethrower',
  water: 'hydroPump',
  grass: 'leafStorm',
  electric: 'wildboltStorm',
  ice: 'blizzard',
  rock: 'stoneEdge',
  flying: 'hurricane',
  bug: 'megahorn',
  dragon: 'outrage',
} as const satisfies Partial<Record<PokeType, MoveId>>

const PAINTABLE = Object.values(SKETCH_COPY)

/**
 * The move Sketch paints off `model` (a foe, or null for none in reach): its
 * first type's move, a boss's stronger one; with no model, `roll` in [0, 1)
 * picks one from memory. Pure.
 */
export const sketchPick = (model: Pick<Enemy, 'types' | 'boss'> | null, roll: number): MoveId => {
  const type = model?.types[0]
  if (!model || !type) return PAINTABLE[Math.min(PAINTABLE.length - 1, Math.floor(roll * PAINTABLE.length))]!
  const strong: Partial<Record<PokeType, MoveId>> = SKETCH_BOSS
  return (model.boss && strong[type]) || SKETCH_COPY[type]
}

/** The foe Sketch paints from: the first living boss within `reach`, else the nearest foe. */
const modelFor = (g: Game, reach: number): Enemy | null => {
  const p = g.player
  const boss = g.enemies.find((e) => e.boss && isAlive(e) && dm.sq(e.x - p.x) + dm.sq(e.y - p.y) <= dm.sq(reach))
  return boss ?? nearestEnemy(g, p.x, p.y, reach)
}

/** Paints a new move when the last painting ran out, then casts it, its hitboxes as Sketch's, with the bubble over the tail. */
const sketch = (g: Game, s: { damage: number; area: number }, owned: OwnedMove) => {
  const p = g.player
  if (!owned.sketch || owned.sketch.left <= 0) {
    const model = modelFor(g, SKETCH.reach * s.area)
    // Only a painting from memory rolls, so a foe in reach never moves the run's rng.
    owned.sketch = { move: sketchPick(model, model ? 0 : g.rng()), left: SKETCH.casts }
    burst(g, p.x + 8, p.y - 14, { colors: ['#58a838', '#f8e070', '#e85050', '#5088e8', '#ffffff'], count: 18, speed: 70, ttl: 0.5, gravity: 60 })
  }
  const id = owned.sketch.move
  owned.sketch.left--
  const def: MoveDef = MOVES[id]
  const painted = moveStats(id, Math.min(owned.level, maxMoveLevel(id)), p.stats)
  const first = g.attacks.length
  def.fire(g, { ...painted, damage: painted.damage * (s.damage / SKETCH.ref) }, owned)
  for (let k = first; k < g.attacks.length; k++) g.attacks[k]!.move = 'sketch'
  spawnAttack(g, {
    move: 'sketch', type: 'normal', visual: 'sketch', x: p.x, y: p.y - 30,
    shape: { kind: 'circle', r: 1 }, motion: { kind: 'follow', ox: 0, oy: -30 }, damage: 0, ttl: 0.8, activeFrom: Infinity,
    // The bubble shows the painted move's icon, `flip` on the cast that painted it.
    tier: MOVE_IDS.indexOf(id), flip: owned.sketch.left === SKETCH.casts - 1,
  })
  g.events.push({ kind: 'cast', move: 'sketch' })
}

const stats = (s: Partial<MoveStats>): MoveStats => ({
  damage: 0, cooldown: 1, area: 1, amount: 1, speed: 0, duration: 1, pierce: Infinity, knockback: 0, statusChance: 0, statusDamage: 0, ...s,
})

export const SKETCH_MOVES = {
  /* Smeargle: paints the move of the foe nearest to it and casts it a few times. */
  sketch: {
    name: 'Sketch',
    type: 'normal',
    base: stats({ damage: SKETCH.ref * 0.85, cooldown: 2.2 }),
    upgrades: [
      { damage: 1 },
      { cooldown: -0.2 },
      { fork: [{ stats: { area: 0.2 }, mods: ['echo'] }, { stats: { damage: 4 }, mods: ['arc'] }] },
      { cooldown: -0.2 },
      { damage: 1.5 },
      { fork: [{ stats: { cooldown: -0.2 }, mods: ['burstOnKill'] }, { stats: { cooldown: -0.2 }, mods: ['hunter'] }] },
      { damage: 1.5 },
    ],
    fire: (g, s, owned) => sketch(g, s, owned),
  },
} as const satisfies Record<string, MoveDef>

export type SketchMoveId = keyof typeof SKETCH_MOVES

export const SKETCH_MOVE_IDS = Object.keys(SKETCH_MOVES) as SketchMoveId[]
