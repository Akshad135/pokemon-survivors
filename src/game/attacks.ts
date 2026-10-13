import { dirTo, retain } from '../engine/math'
import { chance, range } from '../engine/rng'
import { query } from '../engine/spatial'
import { damageEnemy } from './combat'
import { nearestEnemy } from './queries'
import type { Attack, Enemy, Game, Motion } from './types'

const neighbors: number[] = []

const move = (g: Game, a: Attack, m: Motion, dt: number) => {
  const p = g.player
  switch (m.kind) {
    case 'linear':
      a.x += m.vx * dt
      a.y += m.vy * dt
      break
    case 'homing': {
      if (!m.target || m.target.dying >= 0) m.target = nearestEnemy(g, a.x, a.y, 260)
      if (m.target) {
        const want = dirTo(a.x, a.y, m.target.x, m.target.y - m.target.radius)
        const k = Math.min(1, m.turn * dt)
        const vx = m.vx + (want.x * m.speed - m.vx) * k
        const vy = m.vy + (want.y * m.speed - m.vy) * k
        const len = Math.hypot(vx, vy) || 1
        m.vx = (vx / len) * m.speed
        m.vy = (vy / len) * m.speed
      }
      a.x += m.vx * dt
      a.y += m.vy * dt
      break
    }
    case 'orbit':
      m.angle += m.spin * dt
      a.x = p.x + Math.cos(m.angle) * m.radius
      a.y = p.y - 8 + Math.sin(m.angle) * m.radius
      break
    case 'boomerang':
      m.vx += m.ax * dt
      m.vy += m.ay * dt
      a.x += m.vx * dt
      a.y += m.vy * dt
      break
    case 'follow':
      a.x = p.x + m.ox
      a.y = p.y + m.oy
      break
    case 'static':
      break
  }
}

const overlaps = (a: Attack, e: Enemy) => {
  const ey = e.y - e.radius // enemy body center sits above its feet
  if (a.shape.kind === 'circle') return (a.x - e.x) ** 2 + (a.y - ey) ** 2 < (a.shape.r + e.radius) ** 2
  const cx = Math.max(a.x - a.shape.w / 2, Math.min(e.x, a.x + a.shape.w / 2))
  const cy = Math.max(a.y - a.shape.h / 2, Math.min(ey, a.y + a.shape.h / 2))
  return (cx - e.x) ** 2 + (cy - ey) ** 2 < e.radius ** 2
}

const reach = (a: Attack) => (a.shape.kind === 'circle' ? a.shape.r : Math.hypot(a.shape.w, a.shape.h) / 2)

const collide = (g: Game, a: Attack) => {
  for (const i of query(g.grid, a.x, a.y, reach(a) + 40, neighbors)) {
    const e = g.enemies[i]
    if (!e || e.dying >= 0 || !overlaps(a, e)) continue
    if ((a.hits.get(e.id) ?? -1) > g.time) continue
    a.hits.set(e.id, g.time + a.hitInterval)
    damageEnemy(g, e, a)
    if (--a.pierce <= 0) return
  }
}

/** Cosmetic trails, emitted from the simulation so they inherit attack motion. */
const trail = (g: Game, a: Attack) => {
  const emit = (colors: readonly string[], p: number, opts: { speed?: number; gravity?: number; ttl?: number } = {}) => {
    if (!chance(g.rng, p)) return
    g.particles.push({
      x: a.x + range(g.rng, -2, 2), y: a.y + range(g.rng, -2, 2),
      vx: range(g.rng, -1, 1) * (opts.speed ?? 10), vy: range(g.rng, -1, 1) * (opts.speed ?? 10),
      life: 0, ttl: opts.ttl ?? 0.3, color: colors[Math.floor(g.rng() * colors.length)]!, size: 1, gravity: opts.gravity ?? 0, drag: 3,
    })
  }
  switch (a.visual) {
    case 'ember': return emit(['#f8d030', '#f08030', '#c03020'], 0.9, { gravity: -30 })
    case 'flame': return emit(['#f8d030', '#f08030'], 0.4, { gravity: -50 })
    case 'water': return emit(['#a8d8f8', '#6890f0', '#ffffff'], 0.7, { gravity: 60 })
    case 'star': return emit(['#fff8a0', '#ffffff'], 0.5, { ttl: 0.25 })
    case 'sludge': return a.age > a.activeFrom ? emit(['#c070d0', '#a040a0'], 0.25, { gravity: -25, ttl: 0.5, speed: 6 }) : undefined
    case 'flamethrower': return emit(['#f8d030', '#f08030', '#c03020'], 0.8, { gravity: -40, speed: 18 })
    case 'fireBlast': return emit(['#fff8c0', '#f8d030', '#f08030'], 0.7, { gravity: -60, ttl: 0.4 })
    case 'hydroPump': return emit(['#a8d8f8', '#4878e8', '#ffffff'], 1, { gravity: 80, speed: 24 })
    case 'leafStorm': return emit(['#70d048', '#e0f8a0'], 0.3, { ttl: 0.35 })
    case 'triAttack': return emit([['#f06020', '#ffd080'], ['#60c0f0', '#e0f8ff'], ['#f8d830', '#fff8c0']][a.id % 3]!, 0.6, { ttl: 0.25 })
    case 'gunk': return a.age > a.activeFrom ? emit(['#b878c8', '#6a3a78', '#88a038'], 0.35, { gravity: -25, ttl: 0.6, speed: 8 }) : undefined
    case 'hurricane': return emit(['#ffffff', '#c8d0e8'], 0.8, { gravity: -70, speed: 40, ttl: 0.4 })
    default: return
  }
}

export const updateAttacks = (g: Game, dt: number) => {
  for (const a of g.attacks) {
    a.age += dt
    if (a.age < 0) continue
    move(g, a, a.motion, dt)
    if (a.grow > 0 && a.shape.kind === 'circle') a.shape = { kind: 'circle', r: a.shape.r + a.grow * dt }
    trail(g, a)
    if (a.age >= a.activeFrom && a.age <= a.activeUntil) collide(g, a)
  }
  retain(g.attacks, (a) => a.age < a.ttl && a.pierce > 0)
}
