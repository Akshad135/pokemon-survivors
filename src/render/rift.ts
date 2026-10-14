import { blitCentered, blitRotated, context2d, createCanvas, ellipse, ring } from '../engine/pixelart'
import { TAU } from '../engine/math'
import { hash2 } from '../engine/rng'
import { ARENAS, RIFT, type ArenaTheme, type RiftLegend } from '../data/rifts'
import type { RiftArena, RiftPortal } from '../game/rift'
import type { Game } from '../game/types'
import { art, lazy } from './art'
import { dashedRing } from './strokes'

type Ctx = CanvasRenderingContext2D

/* ---------------- Arena ---------------- */

const RING_W = 18
const WALL = 5

const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as const

/**
 * The arena floor, built once per legendary: concentric rings of tiles split
 * into sectors (more per ring, like a temple floor), a seal at the center and
 * a thick wall around the edge.
 */
const buildFloor = (theme: ArenaTheme, r: number) => {
  const size = (r + WALL) * 2 + 1
  const c = r + WALL
  const canvas = createCanvas(size, size)
  const ctx = context2d(canvas)
  const img = ctx.createImageData(size, size)
  const [base, alt, grout] = theme.floor.map(rgb) as [ReturnType<typeof rgb>, ReturnType<typeof rgb>, ReturnType<typeof rgb>]
  const [light, dark] = theme.wall.map(rgb) as [ReturnType<typeof rgb>, ReturnType<typeof rgb>]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c
      const dy = y - c
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > r + WALL) continue
      let color = base
      if (d > r) color = d - r < 2 ? light : dark
      else if (d > r - 2) color = grout
      else if (d < RING_W) color = d > RING_W - 4 && d < RING_W - 2 ? light : (hash2(x, y, 9) < 0.1 ? alt : base)
      else {
        const band = Math.floor(d / RING_W)
        const sectors = 6 + band * 6
        const s = ((Math.atan2(dy, dx) + Math.PI) / TAU) * sectors
        const arc = (d * TAU) / sectors
        const seam = d % RING_W < 1 || (s % 1) * arc < 1
        color = seam ? grout : (band + Math.floor(s)) % 2 === 0 ? base : alt
        // Sparse worn pixels so the tiles don't look flat.
        if (!seam && hash2(x, y, 7) < 0.06) color = color === base ? alt : base
      }
      const i = (y * size + x) * 4
      img.data[i] = color[0]
      img.data[i + 1] = color[1]
      img.data[i + 2] = color[2]
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

const floors = new Map<RiftLegend, HTMLCanvasElement>()

const floorOf = (legend: RiftLegend) => {
  let floor = floors.get(legend)
  if (!floor) floors.set(legend, (floor = buildFloor(ARENAS[legend], RIFT.arenaRadius)))
  return floor
}

const MOTE_TILE = 128
const MOTES = 18

/** The void past the wall, with slow parallax motes, then the floor. Replaces the meadow while in an arena. */
export const drawArena = (ctx: Ctx, arena: RiftArena, camX: number, camY: number, w: number, h: number, t: number) => {
  const theme = ARENAS[arena.legend]
  ctx.fillStyle = theme.void
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = theme.motes
  const ox = Math.round(camX * 0.4)
  const oy = Math.round(camY * 0.4)
  for (let i = 0; i < MOTES; i++) {
    if (Math.sin(t * 2 + i * 1.7) < -0.4) continue // twinkle
    const bx = Math.floor(hash2(i, 1, 77) * MOTE_TILE)
    const by = Math.floor(hash2(i, 2, 77) * MOTE_TILE)
    const x0 = (((bx - ox) % MOTE_TILE) + MOTE_TILE) % MOTE_TILE
    const y0 = (((by - oy) % MOTE_TILE) + MOTE_TILE) % MOTE_TILE
    for (let y = y0; y < h; y += MOTE_TILE) for (let x = x0; x < w; x += MOTE_TILE) ctx.fillRect(x, y, 1, 1)
  }
  const floor = floorOf(arena.legend)
  ctx.drawImage(floor, Math.round(arena.x - floor.width / 2 - camX), Math.round(arena.y - floor.height / 2 - camY))
  // The wall flashes red in the last seconds before the rift collapses.
  if (arena.loot === null && arena.left < 10 && Math.floor(t * (arena.left < 4 ? 8 : 4)) % 2 === 0) {
    blitCentered(ctx, ring(arena.r + 3, 3, '#f83838'), arena.x - camX, arena.y - camY)
  }
}

/* ---------------- Portal on the map ---------------- */

const VORTEX = ['#ffffff', '#c8a8f8', '#7850c8'] as const

/** A glowing tear in the air over a swirl on the ground, filling up as the player stands in it. */
export const drawRiftPortal = (ctx: Ctx, portal: RiftPortal, t: number) => {
  // It blinks faster and faster in its last seconds.
  if (portal.left < 8 && Math.floor(t * (portal.left < 3 ? 10 : 5)) % 3 === 0) return
  const x = Math.round(portal.x)
  const y = Math.round(portal.y)
  const r = RIFT.portalRadius
  const pulse = Math.round((Math.sin(t * 4) + 1) * 1.5)
  const cy = y - 24 + Math.round(Math.sin(t * 2))
  // Ground swirl.
  blitCentered(ctx, ellipse(r + 4, Math.round((r + 4) * 0.4), 'rgba(120,80,200,0.35)'), x, y)
  dashedRing(ctx, x, y, r, t * 5, VORTEX, 0.5, 0.4)
  // Beam of light, then the tear itself, layered from glow to the dark core.
  ctx.fillStyle = 'rgba(200,168,248,0.25)'
  ctx.fillRect(x - 3, cy - 90, 7, 90)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillRect(x - 1, cy - 90, 3, 90)
  blitCentered(ctx, ellipse(12 + pulse, 22 + pulse, 'rgba(200,168,248,0.3)'), x, cy)
  blitCentered(ctx, ellipse(9, 18, '#ffffff'), x, cy)
  blitCentered(ctx, ellipse(8, 17, '#c8a8f8'), x, cy)
  blitCentered(ctx, ellipse(6, 14, '#7850c8'), x, cy)
  blitCentered(ctx, ellipse(4, 11, '#301860'), x, cy)
  blitCentered(ctx, ellipse(2, 7, '#100820'), x, cy)
  dashedRing(ctx, x, cy, 6, -t * 8, VORTEX, 0.4, 2.2)
  if (portal.charge <= 0) return
  // Charge arc: a white ring on the ground that closes as the player steps in.
  const k = Math.min(1, portal.charge / RIFT.enterTime)
  const rr = r + 3
  const steps = Math.ceil(rr * TAU * k)
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI / 2 + i / rr
    ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * 0.4), 2, 1)
  }
}

const ARROW = lazy(() =>
  art(['11.....', '1221...', '122221.', '1222221', '122221.', '1221...', '11.....'], { 1: '#c8a8f8', 2: '#7850c8' }, '#180830'),
)

/** Screen-space arrow on the edge pointing at an off-screen portal. */
export const drawRiftArrow = (ctx: Ctx, g: Game, camX: number, camY: number, t: number) => {
  const portal = g.rift.portal
  if (!portal) return
  const { w, h } = g.view
  const sx = portal.x - camX
  const sy = portal.y - camY
  if (sx > 0 && sx < w && sy > -20 && sy < h) return
  const cx = w / 2
  const cy = h / 2
  const angle = Math.atan2(sy - cy, sx - cx)
  // Margins keep it clear of the HUD: timer and rift pill on top, status box at the bottom.
  const left = 16
  const right = w - 16
  const top = 72
  const bottom = h - 40
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const k = Math.min(dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity, dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity)
  const bob = Math.sin(t * 8) * 2
  blitRotated(ctx, ARROW(), cx + dx * (k + bob), cy + dy * (k + bob), angle, 2)
}
