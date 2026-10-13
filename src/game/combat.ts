import { dirTo } from '../engine/math'
import { chance, range } from '../engine/rng'
import { effectiveness, TYPE_COLORS } from '../data/types'
import { burst, floatText } from './effects'
import { dropPickup, dropXp } from './pickups'
import { applyStatus, STATUS_RULES, type StatusKind } from './status'
import type { Attack, DamageSource, Enemy, Game } from './types'

const TEXT_COLORS = { super: '#ffd830', normal: '#ffffff', weak: '#a8a8b8' } as const

export const damageEnemy = (g: Game, e: Enemy, attack: Attack) => {
  const eff = effectiveness(attack.type, e.types)
  const dmg = Math.max(1, Math.round(attack.damage * eff * range(g.rng, 0.9, 1.1)))
  e.hp -= dmg
  e.flash = 0.16
  g.damageByMove[attack.move] = (g.damageByMove[attack.move] ?? 0) + dmg

  // Vines push sideways; everything else pushes away from the hitbox center.
  const p = g.player
  const away = attack.shape.kind === 'rect' ? { x: Math.sign(e.x - p.x) || 1, y: 0 } : dirTo(attack.x, attack.y, e.x, e.y, p.facing)
  const kb = attack.knockback / e.mass
  e.kx += away.x * kb
  e.ky += away.y * kb

  const status = attack.status
  if (status && chance(g.rng, status.chance)) {
    const fresh = e.status[status.kind].time <= 0
    applyStatus(e.status, status, attack.damage, e.boss, attack.move)
    if (fresh && status.kind !== 'slow') burst(g, e.x, e.y - e.radius, { colors: [STATUS_RULES[status.kind].color, '#ffffff'], count: 5, speed: 50, ttl: 0.3 })
  }

  const color = eff > 1 ? TEXT_COLORS.super : eff < 1 ? TEXT_COLORS.weak : TEXT_COLORS.normal
  floatText(g, e.x, e.y - e.radius * 2 - 4, eff > 1 ? `${dmg}!` : String(dmg), color)
  burst(g, e.x, e.y - e.radius, { colors: [TYPE_COLORS[attack.type], '#ffffff'], count: eff > 1 ? 6 : 3, speed: 70, ttl: 0.25 })
  g.events.push({ kind: 'hit', effective: eff })

  if (e.hp <= 0) killEnemy(g, e)
}

/** Damage-over-time tick: no knockback or hit sound, number in the status color. */
export const dotDamage = (g: Game, e: Enemy, amount: number, move: DamageSource | null, kind: StatusKind) => {
  const dmg = Math.max(1, Math.round(amount))
  e.hp -= dmg
  if (move) g.damageByMove[move] = (g.damageByMove[move] ?? 0) + dmg
  floatText(g, e.x, e.y - e.radius * 2 - 4, String(dmg), STATUS_RULES[kind].color)
  if (e.hp <= 0) killEnemy(g, e)
}

export const killEnemy = (g: Game, e: Enemy) => {
  e.dying = 0
  e.hp = 0
  g.kills++
  burst(g, e.x, e.y - e.radius, { colors: ['#ffffff', '#f8f8c8', '#c8d8f8'], count: e.boss ? 60 : 8, speed: e.boss ? 160 : 70, ttl: 0.45 })
  g.events.push({ kind: 'kill', boss: e.boss })

  if (e.xp > 0) dropXp(g, e.x, e.y, e.xp)
  if (e.boss) {
    dropPickup(g, e.x, e.y, 'pokeball')
    if (g.bossId === e.id) g.bossId = null
    g.shake = 6
    if (e.kind === 'mewtwo') {
      g.phase = 'victory'
      g.events.push({ kind: 'victory' })
    }
  } else if (chance(g.rng, 0.012)) {
    dropPickup(g, e.x + 6, e.y, 'berry')
  }
}

export const hurtPlayer = (g: Game, amount: number, from: Enemy) => {
  const p = g.player
  if (p.iframes > 0 || g.phase !== 'playing') return
  const dmg = Math.max(1, Math.round(amount - p.stats.armor))
  p.hp -= dmg
  p.iframes = 0.5
  p.hurt = 0.3
  g.shake = Math.max(g.shake, 3)
  floatText(g, p.x, p.y - 28, String(dmg), '#ff5040')
  burst(g, p.x, p.y - 10, { colors: ['#ff5040', '#ffffff'], count: 6, speed: 80, ttl: 0.3 })
  g.events.push({ kind: 'hurt' })
  // A small shove keeps the player from being body-blocked into a death spiral.
  const away = dirTo(from.x, from.y, p.x, p.y)
  from.kx -= away.x * 60
  from.ky -= away.y * 60

  if (p.hp <= 0) {
    p.hp = 0
    g.phase = 'gameover'
    g.events.push({ kind: 'gameover' })
  }
}
