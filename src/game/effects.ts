import { retain, TAU } from '../engine/math'
import { pick, range } from '../engine/rng'
import type { Game } from './types'

type BurstOpts = {
  colors: readonly string[]
  count: number
  speed?: number
  size?: number
  ttl?: number
  gravity?: number
  drag?: number
}

const MAX_PARTICLES = 900

/** Radial particle explosion (hits, faints, pickups…). */
export const burst = (g: Game, x: number, y: number, opts: BurstOpts) => {
  const { colors, count, speed = 60, size = 1, ttl = 0.4, gravity = 0, drag = 4 } = opts
  for (let i = 0; i < count && g.particles.length < MAX_PARTICLES; i++) {
    const a = range(g.rng, 0, TAU)
    const s = range(g.rng, speed * 0.3, speed)
    g.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0,
      ttl: range(g.rng, ttl * 0.6, ttl),
      color: pick(g.rng, colors),
      size,
      gravity,
      drag,
    })
  }
}

export const floatText = (g: Game, x: number, y: number, text: string, color: string, damage = false) => {
  if (g.texts.length > 120) g.texts.shift()
  g.texts.push({ x: x + range(g.rng, -4, 4), y, vy: -38, life: 0, text, color, damage })
}

export const updateEffects = (g: Game, dt: number) => {
  for (const p of g.particles) {
    p.life += dt
    p.vy += p.gravity * dt
    const damp = Math.exp(-p.drag * dt)
    p.vx *= damp
    p.vy *= damp
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  retain(g.particles, (p) => p.life < p.ttl)

  for (const t of g.texts) {
    t.life += dt
    t.y += t.vy * dt
    t.vy *= Math.exp(-5 * dt)
  }
  retain(g.texts, (t) => t.life < 0.7)

  g.shake = Math.max(0, g.shake - dt * 18)
}
