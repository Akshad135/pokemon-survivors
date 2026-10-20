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
const PAINTERS: Partial<Record<LegendSky, Painter>> = { downpour }

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
