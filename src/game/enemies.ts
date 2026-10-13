import { dir8, dirTo, retain } from '../engine/math'
import { clearGrid, insert, query } from '../engine/spatial'
import { ENEMIES, type EnemyId } from '../data/enemies'
import { scaling } from '../data/waves'
import { sprites } from '../render/sprites'
import { hurtPlayer } from './combat'
import { createStatus, statusAttack, statusPace } from './status'
import type { Enemy, EnemyBehavior, Game } from './types'

const neighbors: number[] = []

/** Body radius derived from the sprite so big Pokémon take up more space. */
export const radiusFor = (dex: number) => Math.max(5, Math.round(sprites(dex).bodyW * 0.32))

export const spawnEnemy = (g: Game, kind: EnemyId, x: number, y: number, behavior: EnemyBehavior = { kind: 'chase' }) => {
  const def = ENEMIES[kind]
  const boss = 'boss' in def && def.boss
  const scale = scaling(g.time)
  const hp = Math.round(def.hp * (boss ? 1 : scale.hp))
  const enemy: Enemy = {
    id: g.nextId++,
    kind,
    types: def.types,
    x, y, kx: 0, ky: 0,
    hp, maxHp: hp,
    damage: def.damage * (boss ? 1 : scale.damage),
    speed: def.speed * (0.92 + g.rng() * 0.16),
    mass: def.mass,
    radius: radiusFor(def.dex),
    xp: def.xp,
    boss,
    behavior,
    dir: 0,
    animTime: g.rng() * 2,
    flash: 0,
    status: createStatus(),
    dying: -1,
  }
  g.enemies.push(enemy)
  return enemy
}

export const rebuildGrid = (g: Game) => {
  clearGrid(g.grid)
  g.enemies.forEach((e, i) => {
    if (e.dying < 0) insert(g.grid, i, e.x, e.y)
  })
}

const FAINT_TIME = 0.4

export const updateEnemies = (g: Game, dt: number) => {
  const p = g.player
  const recycleDist = Math.hypot(g.view.w, g.view.h) * 0.85

  for (const e of g.enemies) {
    if (e.dying >= 0) {
      e.dying += dt
      continue
    }
    const frozen = e.status.stun > 0
    if (!frozen) e.animTime += dt
    e.flash = Math.max(0, e.flash - dt)
    const pace = e.speed * statusPace(e.status) * (e.flash > 0 ? 0.35 : 1)

    let vx = 0
    let vy = 0
    if (e.behavior.kind === 'chase') {
      const d = dirTo(e.x, e.y, p.x, p.y)
      vx = d.x * pace
      vy = d.y * pace
    } else {
      vx = frozen ? 0 : e.behavior.vx
      vy = frozen ? 0 : e.behavior.vy
      e.behavior.ttl -= dt
      if (e.behavior.ttl <= 0) e.dying = FAINT_TIME // despawn silently
    }

    e.x += (vx + e.kx) * dt
    e.y += (vy + e.ky) * dt
    const damp = Math.exp(-9 * dt)
    e.kx *= damp
    e.ky *= damp
    if (Math.abs(vx) + Math.abs(vy) > 1) e.dir = dir8(vx, vy)

    // Wrap stragglers back in front of the player instead of letting them get lost.
    if (e.behavior.kind === 'chase' && !e.boss && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) > recycleDist * 1.3) {
      e.x = p.x + (p.x - e.x) * 0.7
      e.y = p.y + (p.y - e.y) * 0.7
    }
  }

  // Separation: overlapping enemies push each other apart so hordes form rings, not blobs.
  g.enemies.forEach((e, i) => {
    if (e.dying >= 0) return
    for (const j of query(g.grid, e.x, e.y, e.radius * 2, neighbors)) {
      if (j === i) continue
      const o = g.enemies[j]!
      if (o.dying >= 0) continue
      const dx = e.x - o.x
      const dy = e.y - o.y
      const min = (e.radius + o.radius) * 0.8
      const d2 = dx * dx + dy * dy
      if (d2 >= min * min || d2 === 0) continue
      const d = Math.sqrt(d2)
      const push = ((min - d) / d) * (o.mass / (e.mass + o.mass)) * 0.5
      e.x += dx * push
      e.y += dy * push
    }

    // Keep bodies out of the player and deal contact damage.
    const dx = e.x - p.x
    const dy = e.y - p.y
    const reach = e.radius + p.radius
    const d2 = dx * dx + dy * dy
    if (d2 < reach * reach) {
      const d = Math.sqrt(d2) || 1
      e.x = p.x + (dx / d) * reach
      e.y = p.y + (dy / d) * reach
      hurtPlayer(g, e.damage * statusAttack(e.status), e)
    }
  })

  retain(g.enemies, (e) => e.dying < FAINT_TIME)
}
