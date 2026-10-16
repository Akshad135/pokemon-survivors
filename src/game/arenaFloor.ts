import type { ArenaLayout, ArenaShape, ArenaStepRule, Circle, Pt } from '../data/arenas'

/**
 * Pure geometry of a rift arena's floor (`data/arenas.ts`): which shapes are
 * floor at a given age (the tide grows the holes, the crumbling edge shrinks
 * the floor), where water and lava are, and how to put someone who stepped
 * off back on the nearest bit of floor. Coordinates are relative to the arena
 * center. Only arithmetic and `Math.sqrt`, so every engine agrees.
 */

type Pos = { x: number; y: number }

/** How many steps a rule has taken by arena age `age`. */
export const stepsAt = (rule: ArenaStepRule | undefined, age: number) => (rule ? Math.min(rule.max, Math.floor(age / rule.every)) : 0)

/** Whether the rule's next step is about to land (the warning before it). */
export const stepWarning = (rule: ArenaStepRule | undefined, age: number) =>
  !!rule && stepsAt(rule, age) < rule.max && age % rule.every >= rule.every - rule.warn

/** Moves every vertex `by` px toward the center (a convex polygon centered on the arena stays convex). */
const shrink = (s: ArenaShape, by: number): ArenaShape => {
  if (by === 0) return s
  if (s.kind === 'circle') return { ...s, r: Math.max(0, s.r - by) }
  return {
    kind: 'poly',
    pts: s.pts.map(([x, y]): Pt => {
      const d = Math.sqrt(x * x + y * y) || 1
      const k = Math.max(0, d - by) / d
      return [x * k, y * k]
    }),
  }
}

/** The floor shapes at `steps` crumbles. */
export const floorAt = (layout: ArenaLayout, steps: number) => layout.floor.map((s) => shrink(s, steps * (layout.crumble?.px ?? 0)))

/** The holes after `steps` rises of the tide. */
export const holesAt = (layout: ArenaLayout, steps: number): readonly Circle[] =>
  (layout.holes ?? []).map((h) => ({ ...h, r: h.r + steps * (layout.tide?.px ?? 0) }))

/** Signed area sign of a polygon: which side of its edges is inside. */
const winding = (pts: readonly Pt[]) => {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j]![0] - pts[i]![0]) * (pts[j]![1] + pts[i]![1])
  return a < 0 ? -1 : 1
}

/** Distance from (x, y) inward past each edge of a convex polygon; the smallest one (negative = outside). */
const polyDepth = (pts: readonly Pt[], x: number, y: number) => {
  const w = winding(pts)
  let min = Infinity
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j]!
    const [bx, by] = pts[i]!
    const ex = bx - ax
    const ey = by - ay
    const len = Math.sqrt(ex * ex + ey * ey) || 1
    min = Math.min(min, (w * (ex * (y - ay) - ey * (x - ax))) / len)
  }
  return min
}

/** Whether a circle of radius `r` at (x, y) fits inside the shape. */
export const fits = (s: ArenaShape, x: number, y: number, r: number) =>
  s.kind === 'circle' ? (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) <= (s.r - r) * (s.r - r) && s.r >= r : polyDepth(s.pts, x, y) >= r

/** The nearest point to `o` where a circle of radius `r` fits inside the shape. */
const into = (s: ArenaShape, o: Pos, r: number): Pos => {
  if (s.kind === 'circle') {
    const dx = o.x - s.x
    const dy = o.y - s.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const max = Math.max(0, s.r - r)
    return d <= max ? { x: o.x, y: o.y } : { x: s.x + (dx / d) * max, y: s.y + (dy / d) * max }
  }
  // Push in past each violated edge; a few rounds settle in the corners.
  const p = { x: o.x, y: o.y }
  const w = winding(s.pts)
  for (let round = 0; round < 4; round++) {
    for (let i = 0, j = s.pts.length - 1; i < s.pts.length; j = i++) {
      const [ax, ay] = s.pts[j]!
      const [bx, by] = s.pts[i]!
      const ex = bx - ax
      const ey = by - ay
      const len = Math.sqrt(ex * ex + ey * ey) || 1
      const depth = (w * (ex * (p.y - ay) - ey * (p.x - ax))) / len
      if (depth >= r) continue
      // Inward normal of this edge.
      const nx = (-ey * w) / len
      const ny = (ex * w) / len
      p.x += nx * (r - depth)
      p.y += ny * (r - depth)
    }
  }
  return p
}

/** Keeps a circle on the union of `floor` (and out of `holes`), moving it to the nearest spot that fits. */
export const keepOn = (floor: readonly ArenaShape[], holes: readonly Circle[], o: Pos, r: number) => {
  for (let pass = 0; pass < 2; pass++) {
    for (const h of holes) {
      const dx = o.x - h.x
      const dy = o.y - h.y
      const min = h.r + r
      const d2 = dx * dx + dy * dy
      if (d2 >= min * min) continue
      const d = Math.sqrt(d2) || 1
      o.x = h.x + ((d2 === 0 ? 0 : dx) / d) * min
      o.y = h.y + ((d2 === 0 ? 1 : dy) / d) * min
    }
    if (floor.some((s) => fits(s, o.x, o.y, r))) return
    let best: Pos | null = null
    let bestD = Infinity
    for (const s of floor) {
      const c = into(s, o, r)
      const d = (c.x - o.x) * (c.x - o.x) + (c.y - o.y) * (c.y - o.y)
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    if (best) {
      o.x = best.x
      o.y = best.y
    }
  }
}

/** Whether (x, y) is on the floor at all (shots past it break on the edge). */
export const onFloor = (floor: readonly ArenaShape[], x: number, y: number, grow = 0) => floor.some((s) => fits(s, x, y, -grow))

const segDist = (x: number, y: number, [ax, ay]: Pt, [bx, by]: Pt) => {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  const px = x - ax - dx * t
  const py = y - ay - dy * t
  return Math.sqrt(px * px + py * py)
}

/** How far (x, y) is inside the nearest lava river (positive = in it). */
export const lavaDepth = (layout: ArenaLayout, x: number, y: number) => {
  let depth = -Infinity
  for (const lane of layout.lava ?? []) {
    for (let i = 1; i < lane.pts.length; i++) depth = Math.max(depth, lane.w / 2 - segDist(x, y, lane.pts[i - 1]!, lane.pts[i]!))
  }
  return depth
}

/** Whether (x, y) stands on a bridge. */
export const onBridge = (layout: ArenaLayout, x: number, y: number) =>
  !!layout.bridges?.some((b) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2)

export type ArenaGround = 'land' | 'water' | 'lava'

/** What the arena's ground is at (x, y). */
export const arenaGround = (layout: ArenaLayout, x: number, y: number): ArenaGround => {
  if (lavaDepth(layout, x, y) > 0 && !onBridge(layout, x, y)) return 'lava'
  const wet = layout.shallow?.some((s) => fits(s, x, y, 0)) && !layout.islands?.some((s) => fits(s, x, y, 0))
  return wet ? 'water' : 'land'
}
