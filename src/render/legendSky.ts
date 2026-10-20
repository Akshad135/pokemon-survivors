import { hash2 } from '../engine/rng'
import { domainOf, type LegendSky } from '../data/domains'
import { REVEAL_AT } from '../game/domainRules'
import type { Game } from '../game/types'

type Ctx = CanvasRenderingContext2D

/**
 * A legendary's sky (`LegendDomain.omen.sky`), in screen space over the
 * world: over the map through its omen and while its portal is open, and over
 * its domain from the moment it shows itself. Like the weather, every
 * particle is a pure function of its index and the clock, snapped to pixels.
 * A sky without its own painter yet gets a tint in its color.
 */

type Painter = (ctx: Ctx, w: number, h: number, camX: number, camY: number, t: number) => void

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

/** The Eon duo's dream: a lilac haze, banks of fog drifting across, glints rising, and now and then a red and a blue streak far up in the sky. */
const mist: Painter = (ctx, w, h, camX, camY, t) => {
  ctx.fillStyle = 'rgba(232,220,248,0.2)'
  ctx.fillRect(0, 0, w, h)
  // Fog banks: soft bands at a slow parallax, each breathing in and out.
  for (let i = 0; i < 6; i++) {
    const y = Math.round(mod(hash2(i, 1, 51) * 900 - camY * 0.3, h + 60) - 30)
    const x = Math.round(mod(hash2(i, 2, 51) * 900 - camX * 0.3 + t * (6 + i * 2), w + 240) - 120)
    const a = 0.08 + 0.05 * Math.sin(t * 0.7 + i)
    ctx.fillStyle = `rgba(248,240,255,${a.toFixed(2)})`
    ctx.fillRect(x, y, 200, 10)
    ctx.fillRect(x + 20, y - 4, 150, 4)
    ctx.fillRect(x + 36, y + 10, 120, 4)
  }
  // Dream glints, red and blue, rising and twinkling.
  const n = Math.round((w * h) / 5200)
  for (let i = 0; i < n; i++) {
    if (Math.sin(t * 3 + i * 2.3) < 0.2) continue
    const x = Math.round(mod(hash2(i, 3, 51) * 4096 - camX * 0.6, w))
    const y = Math.round(mod(hash2(i, 4, 51) * 4096 - camY * 0.6 - t * 9, h))
    ctx.fillStyle = i % 3 === 0 ? '#f86078' : i % 3 === 1 ? '#58a0f8' : '#ffffff'
    ctx.fillRect(x, y - 1, 1, 3)
    ctx.fillRect(x - 1, y, 3, 1)
  }
  // The pair far up, streaking across every few seconds.
  const beat = Math.floor(t / 7.5)
  const since = t - beat * 7.5
  if (since < 1.4) {
    const k = since / 1.4
    for (let j = 0; j < 2; j++) {
      const x = Math.round(-20 + (w + 40) * k + j * 10)
      const y = Math.round(h * (0.08 + hash2(beat, j, 53) * 0.1) + j * 6 - Math.sin(k * Math.PI) * 10)
      ctx.fillStyle = j === 0 ? '#f86078' : '#58a0f8'
      ctx.fillRect(x, y, 3, 2)
      for (let q = 1; q < 6; q++) {
        ctx.globalAlpha = 1 - q / 6
        ctx.fillRect(x - q * 4, y + (q % 2), 3, 1)
      }
      ctx.globalAlpha = 1
    }
  }
}

/** Deoxys's meteor shower: a deep night sky, stars twinkling and meteors streaking down with their fiery tails. */
const meteors: Painter = (ctx, w, h, camX, camY, t) => {
  ctx.fillStyle = 'rgba(16,8,40,0.34)'
  ctx.fillRect(0, 0, w, h)
  const stars = Math.round((w * h) / 2600)
  for (let i = 0; i < stars; i++) {
    if (Math.sin(t * 2 + i * 1.9) < -0.5) continue
    ctx.fillStyle = i % 5 === 0 ? '#f8d0a0' : '#e8e8ff'
    ctx.fillRect(Math.round(mod(hash2(i, 1, 61) * 4096 - camX * 0.1, w)), Math.round(mod(hash2(i, 2, 61) * 4096 - camY * 0.1, h)), 1, 1)
  }
  // Meteors: each on its own cycle, falling from the top right to the bottom left.
  const count = Math.max(4, Math.round(w / 70))
  for (let i = 0; i < count; i++) {
    const period = 2.2 + hash2(i, 3, 61) * 2.6
    const cycle = Math.floor((t + hash2(i, 4, 61) * period) / period)
    const k = ((t + hash2(i, 4, 61) * period) % period) / period
    if (k > 0.45) continue
    const q = k / 0.45
    const sx = hash2(i, cycle, 63) * (w + 120)
    const x = Math.round(sx - q * 160)
    const y = Math.round(-20 + q * (h * 0.7 + hash2(cycle, i, 65) * h * 0.3))
    for (let j = 1; j < 12; j++) {
      ctx.globalAlpha = 1 - j / 12
      ctx.fillStyle = j < 4 ? '#f8d070' : '#f86830'
      ctx.fillRect(x + j * 2, y - j * 3, 2, 2)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 1, y - 1, 3, 3)
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
const PAINTERS: Partial<Record<LegendSky, Painter>> = { downpour, mist, meteors }

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
  if (paint) return paint(ctx, w, h, camX, camY, t)
  ctx.fillStyle = TINTS[sky]
  ctx.fillRect(0, 0, w, h)
}
