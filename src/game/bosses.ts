import { retain, TAU } from '../engine/math'
import { range } from '../engine/rng'
import { BOSS_PATTERNS, type BossPattern, type HazardVisual } from '../data/bosses'
import { hurtPlayer } from './combat'
import { burst } from './effects'
import { isAsleep } from './status'
import type { Enemy, Game, Hazard } from './types'

type HazardInit = Pick<Hazard, 'kind' | 'visual' | 'x' | 'y' | 'r' | 'damage' | 'ttl'> & Partial<Hazard>

const spawnHazard = (g: Game, init: HazardInit) => {
  g.hazards.push({ id: g.nextId++, vx: 0, vy: 0, age: 0, armAt: 0, disarmAt: Infinity, vanishOnHit: false, ...init })
}

/** How long a strike keeps hurting after it lands. */
const STRIKE_WINDOW = 0.15

const fire = (g: Game, boss: Enemy, pattern: BossPattern) => {
  const p = g.player
  switch (pattern.kind) {
    case 'strikes': {
      const center = pattern.target === 'player' ? p : boss
      for (let i = 0; i < pattern.count; i++) {
        // The first strike always aims at the target; the rest scatter around it.
        const a = range(g.rng, 0, TAU)
        const d = i === 0 ? 0 : range(g.rng, pattern.radius, pattern.spread)
        spawnHazard(g, {
          kind: 'strike',
          visual: pattern.visual,
          x: center.x + Math.cos(a) * d,
          y: center.y + Math.sin(a) * d * 0.8,
          r: pattern.radius,
          damage: pattern.damage,
          armAt: pattern.delay,
          disarmAt: pattern.delay + STRIKE_WINDOW,
          ttl: pattern.delay + 0.45,
        })
      }
      return
    }
    case 'ring': {
      const offset = range(g.rng, 0, TAU)
      for (let i = 0; i < pattern.count; i++) {
        const a = offset + (i / pattern.count) * TAU
        spawnHazard(g, {
          kind: 'shot',
          visual: pattern.visual,
          x: boss.x + Math.cos(a) * boss.radius,
          y: boss.y + Math.sin(a) * boss.radius,
          vx: Math.cos(a) * pattern.speed,
          vy: Math.sin(a) * pattern.speed,
          r: pattern.radius,
          damage: pattern.damage,
          ttl: 5,
          vanishOnHit: true,
        })
      }
      return
    }
    case 'trail': {
      spawnHazard(g, {
        kind: 'zone',
        visual: pattern.visual,
        x: boss.x + range(g.rng, -3, 3),
        y: boss.y + range(g.rng, -2, 2),
        r: pattern.radius,
        damage: pattern.damage,
        armAt: 0.15,
        disarmAt: pattern.ttl - 0.3,
        ttl: pattern.ttl,
      })
      return
    }
  }
}

/** Ticks every boss's attack patterns. Bosses only attack once they're close enough to be seen. */
export const updateBosses = (g: Game, dt: number) => {
  const reach = Math.hypot(g.view.w, g.view.h) * 0.6
  for (const e of g.enemies) {
    const patterns = BOSS_PATTERNS[e.kind]
    if (!patterns || e.dying >= 0) continue
    // Stunned or asleep bosses hold their attacks (paralysis and the Poké Flute pay off here).
    if (e.status.stun > 0 || isAsleep(e.status)) continue
    if (e.cooldowns.length === 0) e.cooldowns = patterns.map((pt) => pt.every * 0.5)
    const near = Math.hypot(e.x - g.player.x, e.y - g.player.y) < reach
    patterns.forEach((pattern, i) => {
      e.cooldowns[i]! -= dt
      if (e.cooldowns[i]! > 0 || !near) return
      fire(g, e, pattern)
      e.cooldowns[i]! += pattern.every
    })
  }
}

const IMPACT: Partial<Record<HazardVisual, { colors: readonly string[]; event: 'thunder' | 'quake' }>> = {
  rock: { colors: ['#b8a038', '#786028', '#e0c068'], event: 'quake' },
  slam: { colors: ['#e0c068', '#a8a878', '#ffffff'], event: 'quake' },
  thunder: { colors: ['#f8d030', '#ffffff', '#fff8a0'], event: 'thunder' },
  psychic: { colors: ['#f85888', '#f8b0d0', '#ffffff'], event: 'quake' },
}

/** Moves enemy hazards, plays impacts as telegraphs land and hurts the player on contact. */
export const updateHazards = (g: Game, dt: number) => {
  const p = g.player
  for (const h of g.hazards) {
    const before = h.age
    h.age += dt
    h.x += h.vx * dt
    h.y += h.vy * dt

    const impact = IMPACT[h.visual]
    if (impact && h.kind === 'strike' && before < h.armAt && h.age >= h.armAt) {
      burst(g, h.x, h.y, { colors: impact.colors, count: Math.round(h.r * 0.8), speed: h.r * 5, ttl: 0.4 })
      g.shake = Math.max(g.shake, 2)
      g.events.push({ kind: impact.event })
    }

    if (h.age < h.armAt || h.age > h.disarmAt) continue
    const reach = h.r + p.radius * 0.7
    if ((h.x - p.x) ** 2 + (h.y - p.y) ** 2 >= reach * reach) continue
    hurtPlayer(g, h.damage)
    if (h.vanishOnHit) h.age = h.ttl
  }
  retain(g.hazards, (h) => h.age < h.ttl)
}
