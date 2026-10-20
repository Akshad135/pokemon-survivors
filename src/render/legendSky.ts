import { hash2 } from '../engine/rng'
import { domainOf, type LegendSky } from '../data/domains'
import { RIFT } from '../data/rifts'
import { REVEAL_AT } from '../game/domainRules'
import { ellipse, blitCentered } from '../engine/pixelart'
import type { Game } from '../game/types'

type Ctx = CanvasRenderingContext2D

/**
 * A legendary's sky (`LegendDomain.omen.sky`), in screen space over the
 * world: over the map through its omen and while its portal is open, and over
 * its domain from the moment it shows itself. Like the weather, every
 * particle is a pure function of its index and the clock, snapped to pixels.
 * A sky without its own painter yet gets a tint in its color.
 */

type Painter = (ctx: Ctx, w: number, h: number, camX: number, camY: number, t: number, g: Game) => void

const mod = (a: number, n: number) => ((a % n) + n) % n

/** Kyogre's Primordial Sea: a dark sky, sheets of slanted rain and lightning now and then. */
const downpour: Painter = (ctx, w, h, camX, camY, t) => {
  ctx.fillStyle = 'rgba(8,18,52,0.42)'
  ctx.fillRect(0, 0, w, h)
  // Storm clouds weigh on the top of the screen, in bands that thin out downward.
  for (let y = 0; y < h * 0.3; y += 2) {
    const k = 1 - y / (h * 0.3)
    ctx.fillStyle = `rgba(4,8,24,${(0.35 * k).toFixed(2)})`
    ctx.fillRect(0, y, w, 2)
  }
  const n = Math.round((w * h) / 900)
  for (let i = 0; i < n; i++) {
    const speed = 300 + hash2(i, 3, 17) * 120
    const x = Math.round(mod(hash2(i, 1, 17) * 4096 - camX - t * speed * 0.35, w + 20) - 10)
    const y = Math.round(mod(hash2(i, 2, 17) * 4096 - camY + t * speed, h + 20) - 10)
    ctx.fillStyle = i % 3 === 0 ? '#e0ecff' : '#9cb8e8'
    ctx.fillRect(x, y, 1, 3)
    ctx.fillRect(x - 1, y + 3, 1, 3)
  }
  // Lightning: a few frames of white sky every several seconds, with a bolt far off.
  const beat = Math.floor(t / 5.3)
  const since = t - beat * 5.3
  if (hash2(beat, 1, 23) < 0.7 && since < 0.22 && Math.floor(since * 30) % 2 === 0) {
    ctx.fillStyle = 'rgba(232,240,255,0.35)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    let x = Math.round(hash2(beat, 2, 23) * w)
    for (let y = 0; y < h * 0.45; y += 4) {
      x += Math.round((hash2(beat, y, 29) - 0.5) * 8)
      ctx.fillRect(x, y, 2, 4)
    }
  }
}

/** The phase a domain's legendary fights in (0 before the battle, or on the map): its sky grows wilder with it. */
const phaseOf = (g: Game) => {
  const d = g.rift.arena?.domain
  return d ? (g.enemies.find((e) => e.id === d.bossId)?.fight?.phase ?? 0) : 0
}

/**
 * Groudon's Drought: a glaring orange sky, heat shimmering off the ground and
 * dust rising. On the map the sun itself burns in the corner with slow rays;
 * in its magma chamber the heat alone, fiercer once it goes Primal.
 */
const harshSun: Painter = (ctx, w, h, camX, camY, t, g) => {
  const primal = phaseOf(g) >= 2
  ctx.fillStyle = primal ? 'rgba(248,96,24,0.2)' : 'rgba(248,160,48,0.13)'
  ctx.fillRect(0, 0, w, h)
  if (!g.rift.arena) {
    const sx = w - 34
    const sy = 18
    // Rays turning slowly out of the sun.
    ctx.fillStyle = 'rgba(255,240,180,0.16)'
    for (let i = 0; i < 7; i++) {
      const a = t * 0.08 + (i / 7) * Math.PI * 2
      for (let r = 30; r < 150; r += 3) ctx.fillRect(Math.round(sx + Math.cos(a) * r), Math.round(sy + Math.sin(a) * r), 2, 2)
    }
    ctx.globalAlpha = 0.18
    blitCentered(ctx, ellipse(46, 46, '#fff0b0'), sx, sy)
    ctx.globalAlpha = 0.3
    blitCentered(ctx, ellipse(30, 30, '#fff8d0'), sx, sy)
    ctx.globalAlpha = 1
    blitCentered(ctx, ellipse(16, 16, '#fffcf0'), sx, sy)
  }
  // Heat shimmer: faint wavy bands over the lower half.
  ctx.fillStyle = 'rgba(255,236,200,0.09)'
  for (let y = Math.floor(h * 0.45); y < h; y += 7) {
    const off = Math.round(Math.sin(t * 3 + y * 0.4) * 3)
    for (let x = (y * 5) % 11; x < w; x += 11) ctx.fillRect(x + off, y, 6, 1)
  }
  // Dust and embers lifting off the hot ground.
  const n = Math.round((w * h) / (primal ? 1400 : 2600))
  for (let i = 0; i < n; i++) {
    const speed = 10 + hash2(i, 3, 61) * 18
    const x = Math.round(mod(hash2(i, 1, 61) * 4096 - camX + Math.sin(t + i) * 4, w + 10) - 5)
    const y = Math.round(mod(hash2(i, 2, 61) * 4096 - camY - t * speed, h + 10) - 5)
    ctx.fillStyle = i % 4 === 0 ? '#f86818' : i % 4 === 1 ? '#f8d070' : '#e0b078'
    ctx.fillRect(x, y, 1, 1)
  }
}

/** Period of the green streak crossing the sky in Rayquaza's omen, and how long a pass takes, in seconds. */
const STREAK = { every: 5, pass: 3, length: 30 } as const

/**
 * Rayquaza's Air Lock: a gale that blows every other weather away. Streaks of
 * wind race across a pale sky with leaves tumbling in them; on the map a long
 * green streak (Rayquaza itself, high up) crosses the sky now and then.
 */
const gale: Painter = (ctx, w, h, camX, camY, t, g) => {
  const mega = phaseOf(g) >= 2
  ctx.fillStyle = 'rgba(200,236,224,0.14)'
  ctx.fillRect(0, 0, w, h)
  const n = Math.round((w * h) / (mega ? 900 : 1400))
  for (let i = 0; i < n; i++) {
    const speed = 260 + hash2(i, 3, 71) * 180
    const len = 6 + Math.floor(hash2(i, 4, 71) * 14)
    const x = Math.round(mod(hash2(i, 1, 71) * 4096 - camX * 0.5 - t * speed, w + len + 20) - len - 10)
    const y = Math.round(mod(hash2(i, 2, 71) * 4096 - camY * 0.5 + Math.sin(t * 2 + i) * 2, h + 10) - 5)
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(232,248,240,0.5)'
    ctx.fillRect(x, y, len, 1)
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.round(mod(hash2(i, 5, 71) * 4096 - t * 200, w + 20) - 10)
    const y = Math.round(mod(hash2(i, 6, 71) * 4096 + Math.sin(t * 5 + i) * 10, h))
    ctx.fillStyle = i % 2 ? '#78c058' : '#a8d870'
    ctx.fillRect(x, y, Math.floor(t * 8 + i) % 2 ? 2 : 1, Math.floor(t * 8 + i) % 2 ? 1 : 2)
  }
  if (g.rift.arena) return
  const beat = Math.floor(t / STREAK.every)
  const k = (t - beat * STREAK.every) / STREAK.pass
  if (k >= 1) return
  // The serpent: a head and a tail of green with gold bands, weaving along its pass.
  const flip = hash2(beat, 1, 73) < 0.5
  const baseY = h * (0.1 + hash2(beat, 2, 73) * 0.16)
  const head = -60 + k * (w + 120 + STREAK.length * 6)
  for (let j: number = STREAK.length; j >= 0; j--) {
    const along = head - j * 6
    const x = Math.round(flip ? w - along : along)
    const y = Math.round(baseY + Math.sin(along / 30 + beat) * 8)
    const s = j === 0 ? 4 : j < 4 ? 3 : 2
    ctx.fillStyle = j % 5 === 2 ? '#f8e070' : j === 0 ? '#58b868' : '#3c9850'
    ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s)
  }
}

const TINTS: Record<LegendSky, string> = {
  downpour: 'rgba(8,18,52,0.42)',
  harshSun: 'rgba(248,152,40,0.18)',
  gale: 'rgba(200,232,216,0.16)',
  timeWarp: 'rgba(80,120,200,0.22)',
  storm: 'rgba(24,32,64,0.3)',
  embers: 'rgba(200,64,24,0.18)',
  mist: 'rgba(232,224,248,0.22)',
  meteors: 'rgba(16,8,40,0.3)',
}

/** The skies painted so far; the others get their tint until theirs are written. */
const PAINTERS: Partial<Record<LegendSky, Painter>> = { downpour, harshSun, gale }

/** The sky in play: a domain legendary's omen or open portal on the map, or its domain once it has shown itself. */
export const skyNow = (g: Game): LegendSky | null => {
  const arena = g.rift.arena
  const d = arena?.domain
  if (d) {
    const shown = d.act === 'battle' || d.act === 'capture' || d.act === 'after' || (d.act === 'encounter' && d.scene >= REVEAL_AT)
    return shown ? (domainOf(d.legend)?.omen.sky ?? null) : null
  }
  if (arena) return null
  const legend = g.rift.omen?.legend ?? g.rift.portal?.legend
  return legend ? (domainOf(legend)?.omen.sky ?? null) : null
}

/** Paints the sky in play over the frame, if any. */
export const drawLegendSky = (ctx: Ctx, g: Game, camX: number, camY: number, t: number) => {
  const sky = skyNow(g)
  if (!sky) return
  const { w, h } = g.view
  const paint = PAINTERS[sky]
  if (paint) return paint(ctx, w, h, camX, camY, t, g)
  ctx.fillStyle = TINTS[sky]
  ctx.fillRect(0, 0, w, h)
}

/** Grid step (world px) of the cracks Groudon's drought opens in the ground. */
const CRACK_CELL = 44

/**
 * The ground under a legendary's omen, in world space under the entities:
 * Groudon's drought cracks the earth, the cracks spreading as the omen goes
 * on and staying while its portal is open. Drawn only on the map.
 */
export const drawOmenGround = (ctx: Ctx, g: Game) => {
  if (g.rift.arena || skyNow(g) !== 'harshSun') return
  const omen = g.rift.omen
  const k = omen ? 1 - omen.left / RIFT.omenTime : 1
  if (k <= 0) return
  const { x: camX, y: camY } = g.camera
  const { w, h } = g.view
  ctx.fillStyle = 'rgba(56,28,10,0.55)'
  for (let cy = Math.floor(camY / CRACK_CELL) - 1; cy <= Math.floor((camY + h) / CRACK_CELL) + 1; cy++) {
    for (let cx = Math.floor(camX / CRACK_CELL) - 1; cx <= Math.floor((camX + w) / CRACK_CELL) + 1; cx++) {
      // Cracks open one after another through the omen.
      if (hash2(cx, cy, 81) > 0.45 * Math.min(1, k * 1.6)) continue
      const ox = (cx + hash2(cx, cy, 82)) * CRACK_CELL
      const oy = (cy + hash2(cx, cy, 83)) * CRACK_CELL
      const arms = 2 + Math.floor(hash2(cx, cy, 84) * 2)
      for (let a = 0; a < arms; a++) {
        let dir = hash2(cx, cy, 85 + a) * Math.PI * 2
        let x = ox
        let y = oy
        const len = k * (10 + hash2(cx, cy, 90 + a) * 18)
        for (let d = 0; d < len; d += 2) {
          dir += (hash2(cx * 7 + a, Math.floor(d), 95) - 0.5) * 0.9
          x += Math.cos(dir) * 2
          y += Math.sin(dir) * 2
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
        }
      }
    }
  }
}
