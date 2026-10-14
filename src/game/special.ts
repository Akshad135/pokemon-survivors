import { dir8, fromAngle, TAU } from '../engine/math'
import { chance, range } from '../engine/rng'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { TYPE_COLORS, type PokeType } from '../data/types'
import { burst } from './effects'
import { spawnAttack } from './spawn'
import type { PlayerStats } from './stats'
import type { Game } from './types'

/**
 * The manual special attack (Space / touch button / gamepad A). Specials are
 * data keyed by Pokémon type, with optional per-species overrides, so any new
 * starter gets a sensible one from its type. The final evolution stage swaps
 * in the stronger tier (the signature hyper move).
 */

/** How the special plays out once the charge ends. */
export type SpecialKind = 'dash' | 'beam' | 'roots' | 'nova'

type SpecialTier = { name: string; damage: number; area: number }

export type SpecialDef = {
  type: PokeType
  kind: SpecialKind
  /** Seconds between uses, scaled by the cooldown stat. */
  cooldown: number
  /** Wind-up seconds. The player moves slower meanwhile. */
  charge: number
  base: SpecialTier
  /** Used from the final evolution stage on. */
  final: SpecialTier
}

export const SPECIALS = {
  blastBurn: {
    type: 'fire', kind: 'dash', cooldown: 10, charge: 0.3,
    base: { name: 'Flare Blitz', damage: 34, area: 1 },
    final: { name: 'Blast Burn', damage: 60, area: 1.4 },
  },
  hydroCannon: {
    type: 'water', kind: 'beam', cooldown: 12, charge: 0.55,
    base: { name: 'Hydro Pump', damage: 30, area: 1 },
    final: { name: 'Hydro Cannon', damage: 52, area: 1.35 },
  },
  frenzyPlant: {
    type: 'grass', kind: 'roots', cooldown: 11, charge: 0.4,
    base: { name: 'Grass Knot', damage: 30, area: 1 },
    final: { name: 'Frenzy Plant', damage: 54, area: 1.3 },
  },
  boomburst: {
    type: 'normal', kind: 'nova', cooldown: 9, charge: 0.25,
    base: { name: 'Hyper Voice', damage: 28, area: 1 },
    final: { name: 'Boomburst', damage: 48, area: 1.3 },
  },
} as const satisfies Record<string, SpecialDef>

export type SpecialId = keyof typeof SPECIALS

const BY_TYPE: Partial<Record<PokeType, SpecialId>> = { fire: 'blastBurn', water: 'hydroCannon', grass: 'frenzyPlant' }

/** Per-species overrides win over the type table (e.g. a Pikachu starter could get its own). */
const BY_SPECIES: Partial<Record<PlayableId, SpecialId>> = {}

/** Species override, else the first type with a special, else the generic fallback. */
export const specialIdFor = (species: PlayableId, types: readonly PokeType[]): SpecialId =>
  BY_SPECIES[species] ?? types.map((t) => BY_TYPE[t]).find((id) => id !== undefined) ?? 'boomburst'

export const resolveSpecial = (starter: PlayableId, stage: number) => {
  const species = PLAYABLE[starter]
  const id = specialIdFor(starter, species.line[0].types)
  const def: SpecialDef = SPECIALS[id]
  const final = stage >= species.line.length - 1
  return { id, def, final, tier: final ? def.final : def.base }
}

export type ResolvedSpecial = ReturnType<typeof resolveSpecial>

/* ---------------- Timers (pure) ---------------- */

export type SpecialState = {
  /** Seconds until it can be used again. */
  cooldown: number
  /** Cooldown applied on the last use, so the UI can draw the fill ratio. */
  total: number
  /** A press stays queued this long, so pressing slightly early still fires. */
  buffer: number
  /** Wind-up seconds left (> 0 while charging). */
  charge: number
  /** Seconds left of the release phase (dash, beam). */
  active: number
  /** Aim locked at release, in radians. */
  angle: number
  /** Distance dashed since the last fire-trail patch. */
  trail: number
}

export const SPECIAL_BUFFER = 0.25
export const MIN_SPECIAL_COOLDOWN = 4

export const createSpecialState = (): SpecialState => ({ cooldown: 0, total: 1, buffer: 0, charge: 0, active: 0, angle: 0, trail: 0 })

type Timers = Pick<SpecialState, 'cooldown' | 'buffer' | 'charge' | 'active'>

export const specialBusy = (s: Timers) => s.charge > 0 || s.active > 0
export const specialReady = (s: Timers) => s.cooldown <= 0 && !specialBusy(s)

export const specialCooldown = (def: SpecialDef, stats: PlayerStats) => Math.max(MIN_SPECIAL_COOLDOWN, def.cooldown * stats.cooldown)

/** Ticks the cooldown and input buffer. True on the tick a (possibly buffered) press should start the special. */
export const triggerSpecial = (s: Timers, pressed: boolean, dt: number) => {
  s.cooldown = Math.max(0, s.cooldown - dt)
  s.buffer = pressed ? SPECIAL_BUFFER : Math.max(0, s.buffer - dt)
  if (s.buffer <= 0 || !specialReady(s)) return false
  s.buffer = 0
  return true
}

/** Player speed multiplier: slower while charging and beaming, 0 while dashing (the dash moves the player). */
export const specialSpeedFactor = (g: Game) => {
  const s = g.special
  if (s.charge > 0) return 0.45
  if (s.active <= 0) return 1
  return resolveSpecial(g.starter, g.player.stage).def.kind === 'dash' ? 0 : 0.3
}

/* ---------------- Simulation ---------------- */

const DASH_TIME = 0.3
const DASH_DISTANCE = 130
const TRAIL_STEP = 9
const BEAM_TIME = 0.75
const BEAM_LENGTH = 210
const BEAM_STEP = 9
/** Beam reach speed in px/s: far segments switch on slightly later. */
const BEAM_SPEED = 900

const power = (g: Game, r: ResolvedSpecial) => r.tier.damage * g.player.stats.might * (1 + 0.04 * (g.player.level - 1))
const areaOf = (g: Game, r: ResolvedSpecial) => r.tier.area * g.player.stats.area

/** How far an aimed special reaches (dash distance or beam length), for the aim preview. */
export const specialReach = (g: Game, r: ResolvedSpecial) =>
  r.def.kind === 'dash' ? DASH_DISTANCE * r.tier.area : r.def.kind === 'beam' ? BEAM_LENGTH * areaOf(g, r) : 0

const typeColors = (type: PokeType) => [TYPE_COLORS[type], '#ffffff', '#f8f8c8'] as const

/** Sparks converging on the player while charging. */
const chargeFx = (g: Game, r: ResolvedSpecial) => {
  const p = g.player
  if (!chance(g.rng, 0.8)) return
  const a = range(g.rng, 0, TAU)
  const d = range(g.rng, 18, 28)
  g.particles.push({
    x: p.x + Math.cos(a) * d, y: p.y - 10 + Math.sin(a) * d,
    vx: -Math.cos(a) * d * 4, vy: -Math.sin(a) * d * 4,
    life: 0, ttl: 0.22, color: chance(g.rng, 0.5) ? TYPE_COLORS[r.def.type] : '#ffffff', size: 1, gravity: 0, drag: 0,
  })
}

const fireTrail = (g: Game, r: ResolvedSpecial, area: number, dmg: number) => {
  const p = g.player
  spawnAttack(g, {
    move: 'special', type: r.def.type, visual: 'fireTrail', x: p.x + range(g.rng, -2, 2), y: p.y + range(g.rng, -2, 2),
    shape: { kind: 'circle', r: 8 * area }, motion: { kind: 'static' },
    damage: dmg * 0.3, knockback: 10, hitInterval: 0.3, ttl: range(g.rng, 1.3, 1.7), flip: chance(g.rng, 0.5),
  })
}

const explode = (g: Game, r: ResolvedSpecial, x: number, y: number, radius: number, dmg: number) => {
  spawnAttack(g, {
    move: 'special', type: r.def.type, visual: 'blast', x, y,
    shape: { kind: 'circle', r: 8 }, motion: { kind: 'static' },
    damage: dmg, knockback: 240, ttl: 0.4, activeUntil: 0.25, grow: (radius - 8) / 0.25,
  })
  burst(g, x, y, { colors: ['#fff8c0', '#f8d030', '#f08030', '#c03020'], count: 40, speed: radius * 3, ttl: 0.5, gravity: -40 })
  g.shake = Math.max(g.shake, 7)
  g.hitstop = Math.max(g.hitstop, 0.05)
}

const release = (g: Game, r: ResolvedSpecial) => {
  const s = g.special
  const p = g.player
  const area = areaOf(g, r)
  const dmg = power(g, r)
  s.angle = Math.atan2(p.facing.y, p.facing.x)
  g.hitstop = 0.07
  g.shake = Math.max(g.shake, 5)
  g.events.push({ kind: 'special', phase: 'release', name: r.tier.name })
  burst(g, p.x, p.y - 10, { colors: typeColors(r.def.type), count: 24, speed: 120, ttl: 0.35 })

  switch (r.def.kind) {
    case 'dash': {
      s.active = DASH_TIME
      s.trail = TRAIL_STEP
      p.iframes = Math.max(p.iframes, DASH_TIME + 0.25)
      spawnAttack(g, {
        move: 'special', type: r.def.type, visual: 'blitz', x: p.x, y: p.y,
        shape: { kind: 'circle', r: 14 * area }, motion: { kind: 'follow', ox: 0, oy: -8 },
        damage: dmg, knockback: 260, ttl: DASH_TIME,
      })
      return
    }
    case 'beam': {
      s.active = BEAM_TIME
      const dir = fromAngle(s.angle)
      const ox = p.x
      const oy = p.y - 8
      for (let d = 12; d < specialReach(g, r); d += BEAM_STEP) {
        spawnAttack(g, {
          move: 'special', type: r.def.type, visual: 'beam', x: ox + dir.x * d, y: oy + dir.y * d,
          shape: { kind: 'circle', r: 9 * area }, motion: { kind: 'static' },
          damage: dmg * 0.22, knockback: 70, hitInterval: 0.14,
          activeFrom: d / BEAM_SPEED, ttl: BEAM_TIME + d / BEAM_SPEED, from: { x: ox, y: oy },
        })
      }
      return
    }
    case 'roots': {
      const rings = r.final ? 3 : 2
      for (let k = 0; k < rings; k++) {
        const radius = (26 + k * 24) * area
        const count = Math.round((TAU * radius) / 16)
        for (let j = 0; j < count; j++) {
          const a = (j / count) * TAU + k * 0.4
          spawnAttack(g, {
            move: 'special', type: r.def.type, visual: 'roots', x: p.x + Math.cos(a) * radius, y: p.y + Math.sin(a) * radius,
            shape: { kind: 'circle', r: 9 * area }, motion: { kind: 'static' },
            damage: dmg, knockback: 30, status: { kind: 'slow', chance: 1, duration: 0.6, power: 0.75 }, ttl: 0.8, age: -k * 0.13, flip: chance(g.rng, 0.5),
          })
        }
      }
      return
    }
    case 'nova': {
      const waves = r.final ? 2 : 1
      for (let i = 0; i < waves; i++) {
        spawnAttack(g, {
          move: 'special', type: r.def.type, visual: 'nova', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 6 }, motion: { kind: 'follow', ox: 0, oy: -8 },
          damage: dmg, knockback: 240, ttl: 0.45, grow: (95 * area) / 0.45, age: -i * 0.18,
        })
      }
      return
    }
  }
}

const dashTick = (g: Game, r: ResolvedSpecial, dt: number) => {
  const s = g.special
  const p = g.player
  const area = areaOf(g, r)
  const v = specialReach(g, r) / DASH_TIME
  const dir = fromAngle(s.angle)
  p.x += dir.x * v * dt
  p.y += dir.y * v * dt
  p.dir = dir8(dir.x, dir.y)
  s.trail += v * dt
  for (; s.trail >= TRAIL_STEP; s.trail -= TRAIL_STEP) fireTrail(g, r, area, power(g, r))
  if (s.active <= 0) explode(g, r, p.x + dir.x * 10, p.y - 6 + dir.y * 10, 52 * area, power(g, r) * 1.2)
}

/** Spray along the beam while it fires. */
const beamTick = (g: Game, r: ResolvedSpecial) => {
  const s = g.special
  const p = g.player
  const len = specialReach(g, r)
  const dir = fromAngle(s.angle)
  for (let i = 0; i < 3; i++) {
    const d = range(g.rng, 10, len)
    g.particles.push({
      x: p.x + dir.x * d, y: p.y - 8 + dir.y * d,
      vx: range(g.rng, -30, 30) + dir.x * 60, vy: range(g.rng, -40, 10) + dir.y * 60,
      life: 0, ttl: 0.35, color: chance(g.rng, 0.5) ? '#ffffff' : '#a8d0f8', size: 1, gravity: 80, drag: 2,
    })
  }
  burst(g, p.x + dir.x * len, p.y - 8 + dir.y * len, { colors: ['#ffffff', '#a8d0f8', '#6890f0'], count: 2, speed: 90, ttl: 0.3, gravity: 80 })
}

/** Runs the special each tick: trigger → charge → release → active phase. */
export const updateSpecial = (g: Game, pressed: boolean, dt: number) => {
  const s = g.special
  const r = resolveSpecial(g.starter, g.player.stage)
  if (triggerSpecial(s, pressed, dt)) {
    s.cooldown = s.total = specialCooldown(r.def, g.player.stats)
    s.charge = r.def.charge
    g.events.push({ kind: 'special', phase: 'charge', name: r.tier.name })
  }
  if (s.charge > 0) {
    s.charge -= dt
    chargeFx(g, r)
    if (s.charge <= 0) {
      s.charge = 0
      release(g, r)
    }
  } else if (s.active > 0) {
    s.active = Math.max(0, s.active - dt)
    if (r.def.kind === 'dash') dashTick(g, r, dt)
    else if (r.def.kind === 'beam') beamTick(g, r)
  }
}
