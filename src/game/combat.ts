import { dirTo } from '../engine/math'
import { chance, range } from '../engine/rng'
import { effectiveness, TYPE_COLORS, type PokeType } from '../data/types'
import { ENEMY_BERRY_CHANCE } from '../data/consumables'
import { ENEMIES } from '../data/enemies'
import type { HitKind } from '../data/abilities'
import { abilityHolds, abilityHurt, abilityImmune, abilityKill, abilityTakes, strikeBonus } from './abilities'
import { enemyDrop, isRepelled, tryRevive } from './consumables'
import { logDefeat } from './dex'
import { DIFFICULTIES } from './difficulty'
import { burst, damageText, floatText } from './effects'
import { bossEggSource } from './eggs'
import { coinDrops } from './meta'
import { modKill } from './mods'
import { awardEgg, dropCoins, dropPickup, dropXp } from './pickups'
import { applyStatus, breakOnHit, hitTakenMult, STATUS_RULES, type StatusKind } from './status'
import { bonusMult, drainAmount, drainRefill, executes, nearestFoes, SEED_DECAY, SEED_JUMPS, SEED_MIN_TIME, SEED_REACH } from './kitRules'
import { guardHit, moveEvent } from './moveHooks'
import { fallInArena } from './riftArena'
import { countKill } from './tally'
import { absorb } from './traits'
import type { Attack, DamageSource, Enemy, Game } from './types'
import { weatherBoost, weatherHere, weatherPower } from './weather'

const TEXT_COLORS = { super: '#ffd830', normal: '#ffffff', weak: '#a8a8b8', warded: '#88b8f8' } as const

export const damageEnemy = (g: Game, e: Enemy, attack: Attack) => {
  const eff = effectiveness(attack.type, e.types)
  // Conditional bonuses (Hex), a mark and a freeze multiply the hit; without them it's exactly ×1.
  const base = attack.damage * (bonusMult(attack.bonus, e) * hitTakenMult(e.status))
  const raw = Math.max(1, Math.round(base * eff * weatherBoost(weatherHere(g), attack.type) * strikeBonus(g, e) * range(g.rng, 0.9, 1.1)))
  // A Bronzong ward soaks the hit first, unless the ability goes through it (Infiltrator).
  const dmg = abilityImmune(g, 'wards') ? raw : absorb(e.trait, raw)
  e.hp -= dmg
  e.flash = 0.16
  g.damageByMove[attack.move] = (g.damageByMove[attack.move] ?? 0) + dmg
  if (breakOnHit(e.status)) shatter(g, e, 'freeze')

  // Vines push sideways; everything else pushes away from the hitbox center.
  const p = g.player
  const away = attack.shape.kind === 'rect' ? { x: Math.sign(e.x - p.x) || 1, y: 0 } : dirTo(attack.x, attack.y, e.x, e.y, p.facing)
  const kb = attack.knockback / e.mass
  e.kx += away.x * kb
  e.ky += away.y * kb

  const status = attack.status
  if (status && chance(g.rng, status.chance)) {
    const fresh = e.status[status.kind].time <= 0
    applyStatus(e.status, status, base, e.boss, attack.move)
    if (fresh && status.kind !== 'slow') burst(g, e.x, e.y - e.radius, { colors: [STATUS_RULES[status.kind].color, '#ffffff'], count: 5, speed: 50, ttl: 0.3 })
  }

  const color = dmg < raw ? TEXT_COLORS.warded : eff > 1 ? TEXT_COLORS.super : eff < 1 ? TEXT_COLORS.weak : TEXT_COLORS.normal
  damageText(g, e, dmg, color, eff > 1)
  burst(g, e.x, e.y - e.radius, { colors: [TYPE_COLORS[attack.type], '#ffffff'], count: eff > 1 ? 6 : 3, speed: 70, ttl: 0.25 })
  g.events.push({ kind: 'hit', effective: eff })
  if (attack.drain > 0) drainHeal(g, dmg, attack.drain)
  if (attack.move !== 'special' && attack.move !== 'ability') moveEvent(g, attack.move, 'hit')

  if (e.hp > 0 && executes(attack.execute, e.hp, e.maxHp, e.boss)) {
    shatter(g, e, 'execute')
    e.hp = 0
  }
  if (e.hp <= 0) {
    killEnemy(g, e, attack.move)
    if (attack.mod) modKill(g, e, attack)
  }
}

/** Ice shards flying off a foe: a frozen foe's ice broken, or an execute. */
const shatter = (g: Game, e: Enemy, cause: 'execute' | 'freeze') => {
  const colors = cause === 'freeze' ? ['#ffffff', '#c8f0f8', '#78c8f0'] : ['#ffffff', '#f8f8c8', '#f85868']
  burst(g, e.x, e.y - e.radius, { colors, count: 14, speed: 120, ttl: 0.4, gravity: 160, size: 2 })
  g.events.push({ kind: 'shatter', cause })
}

/** Heals `fraction` of `damage` through the drain budget (`kitRules.ts`). Returns the HP restored. */
export const drainHeal = (g: Game, damage: number, fraction: number) => {
  const p = g.player
  const d = p.drain
  d.left = drainRefill(d.left, g.time - d.at, p.stats.maxHp)
  d.at = g.time
  const amount = drainAmount(damage, fraction, d.left)
  if (amount <= 0) return 0
  d.left -= amount
  const healed = healPlayer(g, amount)
  if (healed >= 1 && chance(g.rng, 0.35)) burst(g, p.x, p.y - 12, { colors: ['#78f878', '#d8f8c8'], count: 2, speed: 25, ttl: 0.45, gravity: -50 })
  return healed
}

/**
 * A body blow from the world rather than a hitbox (a thrown foe, a confused
 * one bumping a neighbor): flash, white number, a hit sound, kill credit to `move`.
 */
export const bumpDamage = (g: Game, e: Enemy, amount: number, move: DamageSource | null) => {
  const dmg = Math.max(1, Math.round(amount))
  e.hp -= dmg
  e.flash = 0.16
  if (move) g.damageByMove[move] = (g.damageByMove[move] ?? 0) + dmg
  damageText(g, e, dmg, TEXT_COLORS.normal)
  g.events.push({ kind: 'hit', effective: 1 })
  if (e.hp <= 0) killEnemy(g, e, move)
}

/** A fainting seeded foe passes its seed to its nearest neighbors, a little weaker, with a hop of green specks. */
const spreadSeed = (g: Game, e: Enemy) => {
  const seed = e.status.seed
  const spec = { kind: 'seed', chance: 1, duration: Math.max(seed.time, SEED_MIN_TIME), power: seed.power * SEED_DECAY } as const
  for (const o of nearestFoes(g.enemies, e, SEED_JUMPS, SEED_REACH, (f) => f.status.seed.time > 0)) {
    applyStatus(o.status, spec, 1, o.boss, seed.move)
    const dx = o.x - e.x
    const dy = o.y - o.radius - (e.y - e.radius)
    for (let i = 0; i < 3; i++) {
      const k = 2.2 - i * 0.35
      g.particles.push({ x: e.x, y: e.y - e.radius, vx: dx * k, vy: dy * k - 40, life: 0, ttl: 0.45, color: i ? '#78c850' : '#e0f8a0', size: i ? 1 : 2, gravity: 180, drag: 0 })
    }
  }
}

/** Damage-over-time tick: no knockback or hit sound, number in the status color. */
export const dotDamage = (g: Game, e: Enemy, amount: number, move: DamageSource | null, kind: StatusKind) => {
  const dmg = Math.max(1, Math.round(amount))
  e.hp -= dmg
  if (move) g.damageByMove[move] = (g.damageByMove[move] ?? 0) + dmg
  damageText(g, e, dmg, STATUS_RULES[kind].color)
  if (e.hp <= 0) killEnemy(g, e, move)
}

/** Faints an enemy. `source` (when known) lets a kill by the special, or any kill mid-chain, feed Power Herb. */
export const killEnemy = (g: Game, e: Enemy, source?: DamageSource | null) => {
  if (e.status.seed.time > 0) spreadSeed(g, e)
  e.dying = 0
  e.hp = 0
  g.kills++
  if (source === 'special' || g.special.chaining) g.special.kills++
  countKill(g.tally, e, weatherHere(g), g.biome.id, g.outbreak)
  abilityKill(g, e)
  const big = e.boss || e.shiny
  burst(g, e.x, e.y - e.radius, { colors: ['#ffffff', '#f8f8c8', '#c8d8f8'], count: big ? 60 : 8, speed: big ? 160 : 70, ttl: 0.45 })
  g.events.push({ kind: 'kill', boss: e.boss })
  // A defeated shiny is caught: it joins the player's Pokédex as their own.
  // Announced once per species per run; the shell skips ones the save already has.
  const dex = ENEMIES[e.kind].dex
  const fresh = e.shiny && !g.dexLog.shinies.has(dex)
  logDefeat(g.dexLog, dex, e.shiny)
  if (fresh) g.events.push({ kind: 'caught', enemy: e.kind })

  if (e.xp > 0) dropXp(g, e.x, e.y, e.xp)
  dropCoins(g, e.x, e.y, coinDrops(g.rng, e))
  if (e.shiny) dropPickup(g, e.x + 6, e.y, 'pokeball')
  if (e.boss) {
    // Every boss defeated earns an Esquecer charge (`banishOffer`).
    g.banishes++
    dropPickup(g, e.x, e.y, 'pokeball')
    awardEgg(g, bossEggSource(e.kind), e.x, e.y)
    if (g.bossId === e.id) g.bossId = null
    g.shake = 6
    if (e.kind === 'mewtwo') {
      g.phase = 'victory'
      g.events.push({ kind: 'victory' })
    }
  } else if (chance(g.rng, ENEMY_BERRY_CHANCE)) {
    dropPickup(g, e.x + 6, e.y, 'berry')
  } else {
    enemyDrop(g, e)
  }
}

/**
 * Damages the player. `from` (a body that touched them) gets shoved back; hazards pass none.
 * `types` is the attack's typing for the weather (a body attacks with its own types), and
 * `hit` what kind of harm it is, for the abilities (`abilityTakes`): a body, a boss's strike, lava…
 */
export const hurtPlayer = (g: Game, amount: number, from?: Enemy, types: readonly PokeType[] = from?.types ?? [], hit: HitKind = from ? 'body' : 'hazard') => {
  const p = g.player
  if (p.iframes > 0 || p.hidden || isRepelled(g) || g.phase !== 'playing') return
  if (p.guard) return guardHit(g, p.guard, from)
  const taken = abilityTakes(g, amount, types, hit, from)
  if (taken === null) return
  const dmg = Math.max(1, Math.round(taken * DIFFICULTIES[g.difficulty].enemyDamage * weatherPower(weatherHere(g), types) * p.stats.damageTaken - p.stats.armor))
  p.hp -= dmg
  p.iframes = 0.5
  p.hurt = 0.3
  g.shake = Math.max(g.shake, 3)
  floatText(g, p.x, p.y - 28, String(dmg), '#ff5040', true)
  burst(g, p.x, p.y - 10, { colors: ['#ff5040', '#ffffff'], count: 6, speed: 80, ttl: 0.3 })
  g.events.push({ kind: 'hurt' })
  abilityHurt(g)
  moveEvent(g, null, 'hurt')
  // A small shove keeps the player from being body-blocked into a death spiral.
  if (from) {
    const away = dirTo(from.x, from.y, p.x, p.y)
    from.kx -= away.x * 60
    from.ky -= away.y * 60
  }

  if (p.hp > 0) return
  // Falling in a rift arena isn't the end: the rift throws the player back out.
  if (g.rift.arena) return fallInArena(g)
  // Sturdy holds before a Revive is spent.
  if (!abilityHolds(g) && !tryRevive(g)) {
    p.hp = 0
    g.phase = 'gameover'
    g.events.push({ kind: 'gameover' })
  }
}

/** Heals the player by `amount`, cut or not by the difficulty, up to max HP. Returns the HP actually restored. */
export const healPlayer = (g: Game, amount: number) => {
  const p = g.player
  const healed = Math.max(0, Math.min(amount * DIFFICULTIES[g.difficulty].healing, p.stats.maxHp - p.hp))
  p.hp += healed
  return healed
}
