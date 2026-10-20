import { hash2 } from '../engine/rng'
import { canvasCache, context2d, createCanvas, ring } from '../engine/pixelart'
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

/** Lugia's storm at sea: a slate sky under rolling clouds, wind-driven rain slanting hard, gusts streaking past and lightning. */
const storm: Painter = (ctx, w, h, camX, camY, t) => {
  ctx.fillStyle = 'rgba(14,22,40,0.4)'
  ctx.fillRect(0, 0, w, h)
  // Clouds rolling over the top, their lower edge billowing as they go.
  for (let x = 0; x < w; x += 2) {
    const edge = Math.round(h * 0.16 + Math.sin((x + t * 40) / 23) * 6 + Math.sin((x - t * 25) / 9) * 3)
    ctx.fillStyle = 'rgba(8,12,24,0.45)'
    ctx.fillRect(x, 0, 2, edge)
    ctx.fillStyle = 'rgba(96,112,144,0.35)'
    ctx.fillRect(x, edge, 2, 1)
  }
  const n = Math.round((w * h) / 700)
  for (let i = 0; i < n; i++) {
    const speed = 340 + hash2(i, 3, 19) * 140
    const x = Math.round(mod(hash2(i, 1, 19) * 4096 - camX - t * speed * 0.7, w + 30) - 15)
    const y = Math.round(mod(hash2(i, 2, 19) * 4096 - camY + t * speed, h + 20) - 10)
    ctx.fillStyle = i % 4 === 0 ? '#e8f0ff' : '#8ca4c8'
    ctx.fillRect(x, y, 1, 2)
    ctx.fillRect(x - 1, y + 2, 1, 2)
    ctx.fillRect(x - 2, y + 4, 1, 1)
  }
  // Gusts: long pale streaks blown across the screen.
  ctx.fillStyle = 'rgba(232,240,255,0.45)'
  for (let i = 0; i < 9; i++) {
    const len = 10 + Math.floor(hash2(i, 4, 19) * 18)
    const x = Math.round(mod(hash2(i, 5, 19) * 999 - t * (260 + i * 20), w + len * 2) - len)
    const y = Math.round(mod(hash2(i, 6, 19) * 999 + Math.sin(t + i) * 8, h))
    ctx.fillRect(x, y, len, 1)
  }
  const beat = Math.floor(t / 3.7)
  const since = t - beat * 3.7
  if (hash2(beat, 1, 31) < 0.8 && since < 0.26 && Math.floor(since * 30) % 2 === 0) {
    ctx.fillStyle = 'rgba(224,232,255,0.32)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    let x = Math.round(hash2(beat, 2, 31) * w)
    for (let y = 0; y < h * 0.55; y += 4) {
      x += Math.round((hash2(beat, y, 37) - 0.5) * 10)
      ctx.fillRect(x, y, 2, 4)
      // A fork now and then.
      if (hash2(beat, y, 41) < 0.08) ctx.fillRect(x + 2, y + 2, 4, 1)
    }
  }
}

const rainbows = canvasCache<string, HTMLCanvasElement>()
const RAINBOW = ['#f84848', '#f89838', '#f8e048', '#68d858', '#48a8f8', '#6868e8', '#b058e0'] as const

/** A rainbow arc spanning the screen, baked once per view size: seven hard-edged bands. */
const rainbowOf = (w: number, h: number) => {
  const key = `${w}x${h}`
  const known = rainbows.get(key)
  if (known) return known
  const canvas = createCanvas(w, h)
  const c = context2d(canvas)
  const cx = w / 2
  const cy = h * 0.95
  const r0 = Math.max(w, h) * 0.62
  RAINBOW.forEach((color, i) => {
    c.fillStyle = color
    const r = r0 - i * 3
    for (let x = 0; x < w; x++) {
      const dx = x - cx
      if (Math.abs(dx) >= r) continue
      c.fillRect(x, Math.round(cy - Math.sqrt(r * r - dx * dx)), 1, 3)
    }
  })
  rainbows.set(key, canvas)
  return canvas
}

/** Ho-Oh's sky: a warm glow, a rainbow across it, and embers drifting down, swaying and flickering. */
const embers: Painter = (ctx, w, h, camX, camY, t) => {
  ctx.fillStyle = 'rgba(160,56,16,0.14)'
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 0.2 + 0.05 * Math.sin(t * 0.8)
  ctx.drawImage(rainbowOf(w, h), 0, 0)
  ctx.globalAlpha = 1
  const n = Math.round((w * h) / 2600)
  for (let i = 0; i < n; i++) {
    const fall = 18 + hash2(i, 3, 53) * 26
    const y = Math.round(mod(hash2(i, 2, 53) * 4096 - camY * 0.6 + t * fall, h + 10) - 5)
    const x = Math.round(mod(hash2(i, 1, 53) * 4096 - camX * 0.6 + Math.sin(t * 1.4 + i) * 7, w))
    if (Math.sin(t * 7 + i * 1.3) < -0.6) continue
    ctx.fillStyle = i % 3 === 0 ? '#fff0a0' : i % 3 === 1 ? '#f8a030' : '#f85028'
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1)
  }
}

/** Dialga's distorted time: a cold tint, a ghostly clock over everything whose hands stutter, ripples of time spreading, and glitched rows. */
const timeWarp: Painter = (ctx, w, h, _camX, _camY, t) => {
  ctx.fillStyle = 'rgba(40,64,136,0.2)'
  ctx.fillRect(0, 0, w, h)
  const cx = Math.round(w / 2)
  const cy = Math.round(h / 2)
  const R = Math.round(Math.min(w, h) * 0.42)
  ctx.globalAlpha = 0.22
  ctx.drawImage(ring(R, 2, '#a8f0f8'), cx - R, cy - R)
  ctx.fillStyle = '#a8f0f8'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.fillRect(Math.round(cx + Math.cos(a) * (R - 6)) - 1, Math.round(cy + Math.sin(a) * (R - 6)) - 1, 3, 3)
  }
  // The hands jump in stutters, now and then a step backward.
  const tick = Math.floor(t * 3)
  const minute = (tick + (hash2(tick, 1, 61) < 0.2 ? -2 : 0)) * 0.21
  const hour = tick * 0.03
  for (const [a, len] of [[minute, R - 12], [hour, R * 0.55]] as const) {
    for (let d = 0; d < len; d += 2) ctx.fillRect(Math.round(cx + Math.sin(a) * d), Math.round(cy - Math.cos(a) * d), 2, 2)
  }
  ctx.globalAlpha = 1
  for (let i = 0; i < 2; i++) {
    const k = mod(t / 2.4 + i / 2, 1)
    ctx.globalAlpha = (1 - k) * 0.35
    const r = Math.round(10 + k * Math.max(w, h) * 0.7)
    ctx.drawImage(ring(r, 1, '#d0f8ff'), cx - r, cy - r)
  }
  ctx.globalAlpha = 1
  // The world stutters: a few rows glitch for a moment every few seconds.
  const beat = Math.floor(t / 3.1)
  if (t - beat * 3.1 < 0.14) {
    for (let i = 0; i < 5; i++) {
      const y = Math.round(hash2(beat, i, 67) * h)
      ctx.fillStyle = i % 2 === 0 ? 'rgba(168,240,248,0.5)' : 'rgba(248,120,216,0.35)'
      ctx.fillRect(0, y, w, 1 + (i % 3))
    }
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
const PAINTERS: Partial<Record<LegendSky, Painter>> = { downpour, storm, embers, timeWarp }

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
