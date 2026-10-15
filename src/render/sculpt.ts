import { context2d, createCanvas, type PixelSprite } from '../engine/pixelart'
import { hash2 } from '../engine/rng'

/**
 * A tiny pixel-art sculptor for scenery too big to hand-write as strings:
 * shapes (blobs, footprints, cylinders, cones, shards) are rasterized into a
 * grid and shaded with a short color ramp, ordered-dithered only at the band
 * edges, then outlined. Same look as the hand-made sprites, any size.
 */

/** Shades of one material, darkest first. */
export type Ramp = readonly string[]

export type Grid = { w: number; h: number; px: (string | null)[]; tag: Int16Array }

/** An ellipse: a blob to shade, or a footprint on the ground. `p` > 2 squares it off (a superellipse: 4–6 reads as a rounded rectangle). */
export type Blob = { x: number; y: number; rx: number; ry: number; p?: number }

export const grid = (w: number, h: number): Grid => ({
  w: Math.ceil(w),
  h: Math.ceil(h),
  px: Array<string | null>(Math.ceil(w) * Math.ceil(h)).fill(null),
  tag: new Int16Array(Math.ceil(w) * Math.ceil(h)).fill(-1),
})

const inside = (g: Grid, x: number, y: number) => x >= 0 && y >= 0 && x < g.w && y < g.h

export const get = (g: Grid, x: number, y: number) => (inside(g, x, y) ? g.px[y * g.w + x]! : null)
export const tagAt = (g: Grid, x: number, y: number) => (inside(g, x, y) ? g.tag[y * g.w + x]! : -1)

export const put = (g: Grid, x: number, y: number, color: string, tag = -1) => {
  if (!inside(g, x, y)) return
  g.px[y * g.w + x] = color
  g.tag[y * g.w + x] = tag
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x: number, y: number) => (BAYER[((y & 3) << 2) | (x & 3)]! + 0.5) / 16

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** The ramp shade for light `l` in [0, 1], dithered only near the edges between shades. */
export const shade = (ramp: Ramp, l: number, x: number, y: number, soft = 0.7) => {
  const v = clamp01(l) * (ramp.length - 1) + 0.5 + (bayer(x, y) - 0.5) * soft
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v)))]!
}

/** Light comes from the upper left, slightly toward the viewer. */
const L = (() => {
  const v = [-0.55, -0.75, 0.6] as const
  const n = Math.hypot(...v)
  return [v[0] / n, v[1] / n, v[2] / n] as const
})()

/** Lambert light for a surface normal, remapped so the shadow side keeps some detail. */
export const lambert = (nx: number, ny: number, nz: number) => clamp01((nx * L[0] + ny * L[1] + nz * L[2] + 0.35) / 1.3)

/** Whether (x, y) falls in any of the ellipses, grown (or shrunk, if negative) by `grow` px. */
export const inFoot = (foot: readonly Blob[], x: number, y: number, grow = 0) => {
  for (const e of foot) {
    const rx = e.rx + grow
    const ry = e.ry + grow * (e.ry / e.rx)
    if (rx <= 0 || ry <= 0) continue
    const dx = Math.abs(x - e.x) / rx
    const dy = Math.abs(y - e.y) / ry
    if (e.p ? Math.pow(dx, e.p) + Math.pow(dy, e.p) <= 1 : dx * dx + dy * dy <= 1) return true
  }
  return false
}

/** Smooth 1D value noise in [0, 1): gentle wobble along an edge. */
export const wobble = (t: number, seed: number) => {
  const i = Math.floor(t)
  const f = t - i
  const s = f * f * (3 - 2 * f)
  return hash2(i, 0, seed) * (1 - s) + hash2(i + 1, 0, seed) * s
}

export type Paint = (x: number, y: number, n: { x: number; y: number; z: number }, light: number, blob: number) => string | null

/**
 * Shades overlapping blobs (listed back to front) as lumpy spheres. Where a
 * blob covers the one behind it, the back one gets a dark seam, which is what
 * makes a canopy read as clumps of leaves and a rock pile as separate stones.
 * `facets` quantizes the normals so stones look chiseled instead of round.
 */
export const sculpt = (
  g: Grid,
  blobs: readonly Blob[],
  ramp: Ramp,
  o: { tag?: number; rough?: number; seed?: number; seams?: boolean; facets?: number; paint?: Paint } = {},
) => {
  const base = o.tag ?? 0
  const rough = o.rough ?? 0
  const seed = o.seed ?? 0
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      let hit = -1
      let nx = 0
      let ny = 0
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i]!
        const dx = (x + 0.5 - b.x) / b.rx
        const dy = (y + 0.5 - b.y) / b.ry
        if (dx * dx + dy * dy <= 1) {
          hit = i
          nx = dx
          ny = dy
        }
      }
      if (hit < 0) continue
      if (o.facets) {
        nx = Math.round(nx * o.facets) / o.facets
        ny = Math.round(ny * o.facets) / o.facets
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
      const light = lambert(nx, ny, nz) + (hash2(x, y, seed) - 0.5) * rough
      const color = o.paint?.(x, y, { x: nx, y: ny, z: nz }, light, hit) ?? shade(ramp, light, x, y)
      put(g, x, y, color, base + hit)
    }
  }
  if (o.seams === false) return
  const seams: number[] = []
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const t = tagAt(g, x, y)
      if (t < base || t >= base + blobs.length) continue
      for (const [dx, dy] of NEIGHBORS) {
        const u = tagAt(g, x + dx, y + dy)
        if (u > t && u < base + blobs.length) {
          seams.push(y * g.w + x)
          break
        }
      }
    }
  }
  for (const i of seams) g.px[i] = ramp[0]!
}

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

/** A 1 px outline around everything opaque (the grid needs a free pixel of margin). */
export const outline = (g: Grid, color: string) => {
  const edge: number[] = []
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (g.px[y * g.w + x]) continue
      if (NEIGHBORS.some(([dx, dy]) => get(g, x + dx, y + dy))) edge.push(y * g.w + x)
    }
  }
  for (const i of edge) g.px[i] = color
}

/**
 * A vertical cylinder standing on (cx, ground): towers, pillars, trunks.
 * `paint` can override the body (bricks, windows); the top face gets `top`.
 */
export const cylinder = (
  g: Grid,
  cx: number,
  ground: number,
  r: number,
  height: number,
  ramp: Ramp,
  o: { ry?: number; top?: Ramp | null; tag?: number; paint?: (x: number, y: number, nx: number, elev: number, light: number) => string | null } = {},
) => {
  const ry = o.ry ?? r * 0.4
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const nx = (x + 0.5 - cx) / r
    if (Math.abs(nx) > 1) continue
    const ey = Math.sqrt(1 - nx * nx) * ry
    const bottom = Math.round(ground + ey)
    const nz = Math.sqrt(1 - nx * nx)
    const light = lambert(nx, 0, nz)
    for (let y = Math.floor(ground - height - ry); y <= bottom; y++) {
      const front = ground - height + ey
      if (y >= front) {
        const elev = bottom - y
        put(g, x, y, o.paint?.(x, y, nx, elev, light) ?? shade(ramp, light, x, y), o.tag ?? -1)
      } else if (o.top !== null && Math.abs(y + 0.5 - (ground - height)) <= ey) {
        put(g, x, y, shade(o.top ?? ramp, 0.75 + light * 0.25, x, y), o.tag ?? -1)
      }
    }
  }
}

/** A cone (roofs, spires, stalagmites) with its base ellipse at `base` and its apex `height` px above. */
export const cone = (
  g: Grid,
  cx: number,
  base: number,
  r: number,
  height: number,
  ramp: Ramp,
  o: { ry?: number; rows?: number; tag?: number; flare?: number } = {},
) => {
  const ry = o.ry ?? r * 0.4
  const apex = base - height
  const flare = o.flare ?? 1
  for (let y = Math.floor(apex); y <= Math.ceil(base + ry); y++) {
    const t = Math.min(1, (y + 0.5 - apex) / height)
    // `flare` > 1 bows the sides out like a pagoda eave.
    const half = r * Math.pow(t, 1 / flare)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx
      if (Math.abs(dx) > half) continue
      const nx = dx / r
      const ey = Math.sqrt(Math.max(0, 1 - nx * nx)) * ry
      if (y > base + ey) continue
      const n = dx / Math.max(1, half)
      let light = lambert(n * 0.9, -0.35, Math.sqrt(Math.max(0, 1 - n * n * 0.81)))
      if (o.rows && Math.floor(y - apex) % o.rows === 0) light -= 0.25
      put(g, x, y, shade(ramp, light, x, y), o.tag ?? -1)
    }
  }
}

/**
 * A solid of revolution standing on (cx, ground): `radius(t)` gives its
 * half-width at height `t` (0 at the foot, 1 at the top). Bells, urns, columns.
 */
export const lathe = (g: Grid, cx: number, ground: number, height: number, radius: (t: number) => number, ramp: Ramp, o: { ry?: number; tag?: number } = {}) => {
  const ryK = o.ry ?? 0.4
  for (let y = Math.floor(ground - height - 4); y <= Math.ceil(ground + 4); y++) {
    for (let x = Math.floor(cx - height); x <= Math.ceil(cx + height); x++) {
      const dx = x + 0.5 - cx
      // The front-most surface point under this pixel: scan heights from the top down.
      for (let e = height; e >= 0; e -= 0.5) {
        const r = radius(e / height)
        if (Math.abs(dx) > r) continue
        const nx = dx / Math.max(0.5, r)
        const front = ground - e + Math.sqrt(Math.max(0, 1 - nx * nx)) * r * ryK
        if (Math.abs(y + 0.5 - front) > 0.75) continue
        const slope = (radius(Math.min(1, e / height + 0.02)) - radius(Math.max(0, e / height - 0.02))) / (0.04 * height)
        put(g, x, y, shade(ramp, lambert(nx * 0.9, -0.3 - slope * 0.4, Math.sqrt(Math.max(0, 1 - nx * nx * 0.81))), x, y), o.tag ?? -1)
        break
      }
    }
  }
}

/** A crystal shard leaning by `angle` (0 = straight up): a lit face and a shadow face, split down the middle. */
export const shard = (g: Grid, x: number, y: number, length: number, width: number, angle: number, ramp: Ramp, tag = -1) => {
  const ux = Math.sin(angle)
  const uy = -Math.cos(angle)
  const vx = -uy
  const vy = ux
  const half = width / 2
  for (let py = Math.floor(y - length - width); py <= Math.ceil(y + width); py++) {
    for (let px = Math.floor(x - length - width); px <= Math.ceil(x + length + width); px++) {
      const dx = px + 0.5 - x
      const dy = py + 0.5 - y
      const along = dx * ux + dy * uy
      const across = dx * vx + dy * vy
      if (along < 0 || along > length) continue
      const taper = along > length * 0.7 ? half * (1 - (along - length * 0.7) / (length * 0.3)) : half
      if (Math.abs(across) > taper) continue
      const edge = Math.abs(across) > taper - 1
      const light = across < 0 ? 0.85 : 0.35
      put(g, px, py, edge && across < 0 ? ramp[ramp.length - 1]! : shade(ramp, light + along / length * 0.15, px, py), tag)
    }
  }
}

/** Stamps a string sprite (`.` = clear) into the grid at (x, y). */
export const stamp = (g: Grid, rows: readonly string[], palette: Readonly<Record<string, string>>, x: number, y: number, tag = -1) =>
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const c = palette[row[dx]!]
      if (c) put(g, Math.round(x) + dx, Math.round(y) + dy, c, tag)
    }
  })

/** A thick line of round stamps, shaded lighter on its lit (left) rim: branches, roots. */
export const limb = (g: Grid, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ramp: Ramp, tag = -1) => {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = x0 + (x1 - x0) * t
    const cy = y0 + (y1 - y0) * t
    const r = r0 + (r1 - r0) * t
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = (x + 0.5 - cx) / Math.max(0.5, r)
        const dy = (y + 0.5 - cy) / Math.max(0.5, r)
        if (dx * dx + dy * dy > 1) continue
        put(g, x, y, shade(ramp, lambert(dx, dy * 0.3, Math.sqrt(Math.max(0, 1 - dx * dx))), x, y), tag)
      }
    }
  }
}

const rgb = new Map<string, readonly [number, number, number]>()
const rgbOf = (hex: string) => {
  let c = rgb.get(hex)
  if (!c) rgb.set(hex, (c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]))
  return c
}

/** Paints the grid (`#rrggbb` colors) into a canvas. */
export const toSprite = (g: Grid): PixelSprite => {
  const canvas = createCanvas(g.w, g.h)
  const ctx = context2d(canvas)
  const img = ctx.createImageData(g.w, g.h)
  g.px.forEach((c, i) => {
    if (!c) return
    const [r, gr, b] = rgbOf(c)
    img.data[i * 4] = r
    img.data[i * 4 + 1] = gr
    img.data[i * 4 + 2] = b
    img.data[i * 4 + 3] = 255
  })
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Deterministic noise in [0, 1) for sprite texture. */
export const noise = hash2
