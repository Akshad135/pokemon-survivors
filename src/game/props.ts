import { retain } from '../engine/math'
import { hash2, weightedPick } from '../engine/rng'
import { DROP_TABLES, PROPS, rollDrop, type PropKind } from '../data/consumables'
import { dropItem } from './consumables'
import { burst } from './effects'
import { inView } from './queries'
import type { Attack, Game } from './types'

/**
 * Breakable item sources (VS light sources). The world is split into cells
 * and each cell deterministically holds zero or one prop, so the map looks
 * the same when revisited. Only cells around the player are materialized.
 */
export type Prop = {
  id: number
  /** Packed world-cell key; also used to remember broken props. */
  cell: number
  kind: PropKind
  x: number
  y: number
  hp: number
  hitCooldown: number
  /** Seconds of hit wobble left (render only). */
  shake: number
}

export const PROP_CELL = 160
const DENSITY = 0.22
const SEED = 4242
const MARGIN = 24
const KIND_WEIGHTS = (Object.keys(PROPS) as PropKind[]).map((k) => [k, PROPS[k].weight] as const)

const cellKey = (cx: number, cy: number) => (cx + 32768) * 65536 + (cy + 32768)

/** The prop living in world cell (cx, cy), if any. Pure and deterministic. */
export const propAt = (cx: number, cy: number): { kind: PropKind; x: number; y: number } | null => {
  if (hash2(cx, cy, SEED) >= DENSITY) return null
  const kind = weightedPick(() => hash2(cx, cy, SEED + 1), KIND_WEIGHTS)
  const span = PROP_CELL - MARGIN * 2
  return {
    kind,
    x: Math.round(cx * PROP_CELL + MARGIN + hash2(cx, cy, SEED + 2) * span),
    y: Math.round(cy * PROP_CELL + MARGIN + hash2(cx, cy, SEED + 3) * span),
  }
}

/** Cells (Chebyshev) around the player that hold live props; one ring past the screen so they never pop in. */
const reachCells = (g: Game) => Math.ceil(Math.hypot(g.view.w, g.view.h) / 2 / PROP_CELL) + 1

const materialize = (g: Game) => {
  const reach = reachCells(g)
  const pcx = Math.floor(g.player.x / PROP_CELL)
  const pcy = Math.floor(g.player.y / PROP_CELL)
  for (let cy = pcy - reach; cy <= pcy + reach; cy++) {
    for (let cx = pcx - reach; cx <= pcx + reach; cx++) {
      const cell = cellKey(cx, cy)
      if (g.brokenProps.has(cell) || g.props.some((p) => p.cell === cell)) continue
      const spot = propAt(cx, cy)
      if (spot) g.props.push({ id: g.nextId++, cell, ...spot, hp: PROPS[spot.kind].hp, hitCooldown: 0, shake: 0 })
    }
  }
}

const touches = (a: Attack, x: number, y: number, r: number) => {
  if (a.shape.kind === 'circle') return (a.x - x) ** 2 + (a.y - y) ** 2 < (a.shape.r + r) ** 2
  const cx = Math.max(a.x - a.shape.w / 2, Math.min(x, a.x + a.shape.w / 2))
  const cy = Math.max(a.y - a.shape.h / 2, Math.min(y, a.y + a.shape.h / 2))
  return (cx - x) ** 2 + (cy - y) ** 2 < r * r
}

const PROP_COLORS: Record<PropKind, readonly string[]> = {
  itemBall: ['#e83838', '#ffffff', '#202028'],
  berryTree: ['#48a038', '#88d058', '#3870d8', '#a06838'],
  tallGrass: ['#4f9e48', '#78c060', '#2f7a3a'],
}

const hitProp = (g: Game, prop: Prop) => {
  prop.hp--
  prop.hitCooldown = 0.2
  prop.shake = 0.2
  const colors = PROP_COLORS[prop.kind]
  burst(g, prop.x, prop.y - 6, { colors, count: 4, speed: 50, ttl: 0.3 })
  if (prop.hp > 0) return
  g.brokenProps.add(prop.cell)
  burst(g, prop.x, prop.y - 6, { colors, count: 18, speed: 90, ttl: 0.5, gravity: 80 })
  dropItem(g, prop.x, prop.y - 2, rollDrop(DROP_TABLES[PROPS[prop.kind].table], g.time, g.rng))
  g.events.push({ kind: 'propBreak' })
}

/** Spawns/despawns props around the player and lets any active attack break them. */
export const updateProps = (g: Game, dt: number) => {
  // Re-scanning cells 4x per second is plenty: props live a ring past the screen edge.
  if (g.props.length === 0 || Math.floor(g.time * 4) !== Math.floor((g.time - dt) * 4)) {
    const far = (reachCells(g) + 1.5) * PROP_CELL
    const p = g.player
    retain(g.props, (prop) => Math.abs(prop.x - p.x) < far && Math.abs(prop.y - p.y) < far)
    materialize(g)
  }

  for (const prop of g.props) {
    prop.shake = Math.max(0, prop.shake - dt)
    prop.hitCooldown -= dt
    if (prop.hitCooldown > 0 || !inView(g, prop.x, prop.y, 24)) continue
    const r = PROPS[prop.kind].radius
    for (const a of g.attacks) {
      if (a.age < a.activeFrom || a.age > a.activeUntil || a.age < 0) continue
      if (!touches(a, prop.x, prop.y - r, r)) continue
      hitProp(g, prop)
      break
    }
  }
  retain(g.props, (prop) => prop.hp > 0)
}
