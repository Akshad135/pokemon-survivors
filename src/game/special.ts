import { dir8, fromAngle, TAU } from '../engine/math'
import { chance, pick, range } from '../engine/rng'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { TYPE_COLORS, type PokeType } from '../data/types'
import { burst } from './effects'
import { enemiesInView } from './queries'
import { spawnAttack } from './spawn'
import type { StatusSpec } from './status'
import type { PlayerStats } from './stats'
import type { Game } from './types'
import * as dm from '../engine/dmath'

/**
 * The manual special attack (Space / touch button / gamepad A). Each of the 18
 * types has one, as data: a form (`SpecialKind`) tuned by its tiers, plus the
 * type's color and condition. Fire, Water and Grass keep their bespoke forms;
 * the rest share six parametrized ones (bolt, nova, rain, ring, wave, trail).
 * Per-species overrides can win over the type. The final evolution stage swaps
 * in the stronger tier.
 */

/**
 * How the special plays out once the charge ends.
 * - dash: flaming charge with a fire trail · beam: aimed jet · roots: rings of roots
 * - nova: shock waves around the player · bolt: strikes from the sky on the nearest foes
 * - rain: projectiles falling around the player · ring: a volley fired all around
 * - wave: an aimed wall sweeping forward · trail: hazard patches left behind while moving
 */
export type SpecialKind = 'dash' | 'beam' | 'roots' | 'nova' | 'bolt' | 'rain' | 'ring' | 'wave' | 'trail'

type SpecialTier = {
  name: string
  damage: number
  area: number
  /**
   * How many pieces the form makes: rings of roots, shock waves, bolts, falling
   * projectiles, projectiles in the ring, wave segments or trail patches.
   * Dash and beam ignore it.
   */
  count: number
}

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
  /** The type's condition, rolled on every hit. */
  status?: StatusSpec
}

export const SPECIALS = {
  blastBurn: {
    type: 'fire', kind: 'dash', cooldown: 10, charge: 0.3,
    base: { name: 'Flare Blitz', damage: 34, area: 1, count: 1 },
    final: { name: 'Blast Burn', damage: 60, area: 1.4, count: 1 },
  },
  hydroCannon: {
    type: 'water', kind: 'beam', cooldown: 12, charge: 0.55,
    base: { name: 'Hydro Pump', damage: 30, area: 1, count: 1 },
    final: { name: 'Hydro Cannon', damage: 52, area: 1.35, count: 1 },
  },
  frenzyPlant: {
    type: 'grass', kind: 'roots', cooldown: 11, charge: 0.4,
    base: { name: 'Grass Knot', damage: 30, area: 1, count: 2 },
    final: { name: 'Frenzy Plant', damage: 54, area: 1.3, count: 3 },
    status: { kind: 'slow', chance: 1, duration: 0.6, power: 0.75 },
  },
  boomburst: {
    type: 'normal', kind: 'nova', cooldown: 9, charge: 0.25,
    base: { name: 'Hyper Voice', damage: 28, area: 1, count: 1 },
    final: { name: 'Boomburst', damage: 48, area: 1.3, count: 2 },
  },
  boltStrike: {
    type: 'electric', kind: 'bolt', cooldown: 9, charge: 0.35,
    base: { name: 'Thunderbolt', damage: 34, area: 1, count: 5 },
    final: { name: 'Bolt Strike', damage: 58, area: 1.25, count: 8 },
    status: { kind: 'paralysis', chance: 0.6, duration: 1.6, power: 0 },
  },
  doomDesire: {
    type: 'steel', kind: 'bolt', cooldown: 10, charge: 0.4,
    base: { name: 'Magnet Bomb', damage: 40, area: 1.15, count: 4 },
    final: { name: 'Doom Desire', damage: 68, area: 1.45, count: 6 },
  },
  lightOfRuin: {
    type: 'fairy', kind: 'bolt', cooldown: 9, charge: 0.35,
    base: { name: 'Dazzling Gleam', damage: 30, area: 1, count: 6 },
    final: { name: 'Light of Ruin', damage: 52, area: 1.2, count: 9 },
    status: { kind: 'sleep', chance: 0.35, duration: 1.5, power: 0 },
  },
  expandingForce: {
    type: 'psychic', kind: 'nova', cooldown: 9, charge: 0.3,
    base: { name: 'Psychic', damage: 30, area: 1, count: 1 },
    final: { name: 'Expanding Force', damage: 50, area: 1.35, count: 2 },
    status: { kind: 'slow', chance: 0.6, duration: 1.2, power: 0.5 },
  },
  nightDaze: {
    type: 'dark', kind: 'nova', cooldown: 9, charge: 0.3,
    base: { name: 'Dark Pulse', damage: 28, area: 1, count: 1 },
    final: { name: 'Night Daze', damage: 48, area: 1.3, count: 2 },
    status: { kind: 'sleep', chance: 0.35, duration: 1.5, power: 0 },
  },
  dracoMeteor: {
    type: 'dragon', kind: 'rain', cooldown: 11, charge: 0.45,
    base: { name: 'Dragon Pulse', damage: 30, area: 1, count: 10 },
    final: { name: 'Draco Meteor', damage: 52, area: 1.3, count: 16 },
    status: { kind: 'burn', chance: 0.3, duration: 2, power: 0.3 },
  },
  diamondStorm: {
    type: 'rock', kind: 'rain', cooldown: 10, charge: 0.4,
    base: { name: 'Rock Slide', damage: 32, area: 1, count: 10 },
    final: { name: 'Diamond Storm', damage: 52, area: 1.25, count: 16 },
  },
  blizzard: {
    type: 'ice', kind: 'rain', cooldown: 10, charge: 0.4,
    base: { name: 'Icicle Crash', damage: 26, area: 1, count: 11 },
    final: { name: 'Blizzard', damage: 42, area: 1.25, count: 18 },
    status: { kind: 'slow', chance: 1, duration: 1.5, power: 0.6 },
  },
  astralBarrage: {
    type: 'ghost', kind: 'ring', cooldown: 9, charge: 0.3,
    base: { name: 'Shadow Ball', damage: 30, area: 1, count: 10 },
    final: { name: 'Astral Barrage', damage: 50, area: 1.25, count: 16 },
    status: { kind: 'paralysis', chance: 0.3, duration: 1.2, power: 0 },
  },
  auraSphere: {
    type: 'fighting', kind: 'ring', cooldown: 9, charge: 0.3,
    base: { name: 'Vacuum Wave', damage: 32, area: 1, count: 10 },
    final: { name: 'Aura Sphere', damage: 54, area: 1.25, count: 16 },
  },
  attackOrder: {
    type: 'bug', kind: 'ring', cooldown: 9, charge: 0.3,
    base: { name: 'Pin Missile', damage: 24, area: 1, count: 12 },
    final: { name: 'Attack Order', damage: 40, area: 1.2, count: 20 },
    status: { kind: 'poison', chance: 0.4, duration: 3, power: 0.25 },
  },
  precipiceBlades: {
    type: 'ground', kind: 'wave', cooldown: 10, charge: 0.35,
    base: { name: 'Bulldoze', damage: 32, area: 1, count: 5 },
    final: { name: 'Precipice Blades', damage: 54, area: 1.3, count: 7 },
    status: { kind: 'slow', chance: 1, duration: 1, power: 0.5 },
  },
  aeroblast: {
    type: 'flying', kind: 'wave', cooldown: 9, charge: 0.3,
    base: { name: 'Air Cutter', damage: 30, area: 1, count: 5 },
    final: { name: 'Aeroblast', damage: 50, area: 1.3, count: 7 },
  },
  malignantChain: {
    type: 'poison', kind: 'trail', cooldown: 11, charge: 0.2,
    base: { name: 'Toxic Spikes', damage: 30, area: 1, count: 18 },
    final: { name: 'Malignant Chain', damage: 50, area: 1.25, count: 26 },
    status: { kind: 'poison', chance: 1, duration: 3, power: 0.3 },
  },
} as const satisfies Record<string, SpecialDef>

export type SpecialId = keyof typeof SPECIALS

export const SPECIAL_IDS = Object.keys(SPECIALS) as SpecialId[]

/** One special per type. A dual type uses its first type. */
const BY_TYPE = {
  normal: 'boomburst', fire: 'blastBurn', water: 'hydroCannon', grass: 'frenzyPlant',
  electric: 'boltStrike', poison: 'malignantChain', flying: 'aeroblast', bug: 'attackOrder',
  rock: 'diamondStorm', ground: 'precipiceBlades', ghost: 'astralBarrage', fighting: 'auraSphere',
  psychic: 'expandingForce', ice: 'blizzard', steel: 'doomDesire', dark: 'nightDaze',
  fairy: 'lightOfRuin', dragon: 'dracoMeteor',
} as const satisfies Record<PokeType, SpecialId>

/** Per-species overrides win over the type table (e.g. a Pikachu starter could get its own). */
const BY_SPECIES: Partial<Record<PlayableId, SpecialId>> = {}

export const specialOfType = (type: PokeType): SpecialId => BY_TYPE[type]

/** Species override, else the special of its first type. */
export const specialIdFor = (species: PlayableId, types: readonly PokeType[]): SpecialId =>
  BY_SPECIES[species] ?? specialOfType(types[0] ?? 'normal')

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
  /** Distance dashed (dash) or seconds walked (trail) since the last trail patch. */
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

/**
 * Player speed multiplier: slower while charging and beaming, 0 while dashing
 * (the dash moves the player) and a little faster while laying a trail.
 */
export const specialSpeedFactor = (g: Game) => {
  const s = g.special
  if (s.charge > 0) return 0.45
  if (s.active <= 0) return 1
  const kind = resolveSpecial(g.starter, g.player.stage).def.kind
  return kind === 'dash' ? 0 : kind === 'trail' ? TRAIL_SPEED : 0.3
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
/** Bolts land this long after release, one after another. */
const BOLT_DELAY = 0.14
const BOLT_STAGGER = 0.07
/** Bolts with no foe in view land this far around the player. */
const BOLT_SCATTER = 90
/** Falling projectiles land within RAIN_TIME seconds, inside RAIN_RADIUS px of the player. */
const RAIN_TIME = 1
const RAIN_RADIUS = 105
/** Share of the falling projectiles aimed at foes in that radius. */
const RAIN_AIMED = 0.6
const RING_SPEED = 210
const RING_TTL = 0.85
const WAVE_SPEED = 175
const WAVE_TTL = 0.9
const WAVE_GAP = 12
/** Seconds between trail patches, and the speed boost while laying them. */
const TRAIL_EVERY = 0.09
const TRAIL_SPEED = 1.15
/** How long a strike from the sky (bolt, rain) hurts after landing. */
const IMPACT_WINDOW = 0.1

const power = (g: Game, r: ResolvedSpecial) => r.tier.damage * g.player.stats.might * (1 + 0.04 * (g.player.level - 1))
const areaOf = (g: Game, r: ResolvedSpecial) => r.tier.area * g.player.stats.area

/** How far an aimed special reaches (dash distance, beam length, wave travel), for the aim preview. 0 when it isn't aimed. */
export const specialReach = (g: Game, r: ResolvedSpecial) => {
  switch (r.def.kind) {
    case 'dash': return DASH_DISTANCE * r.tier.area
    case 'beam': return BEAM_LENGTH * areaOf(g, r)
    case 'wave': return WAVE_SPEED * WAVE_TTL
    default: return 0
  }
}

const typeColors = (type: PokeType) => [TYPE_COLORS[type], '#ffffff', '#f8f8c8'] as const

/** Sparks converging on the player while charging. */
const chargeFx = (g: Game, r: ResolvedSpecial) => {
  const p = g.player
  if (!chance(g.rng, 0.8)) return
  const a = range(g.rng, 0, TAU)
  const d = range(g.rng, 18, 28)
  g.particles.push({
    x: p.x + dm.cos(a) * d, y: p.y - 10 + dm.sin(a) * d,
    vx: -dm.cos(a) * d * 4, vy: -dm.sin(a) * d * 4,
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
  s.angle = dm.atan2(p.facing.y, p.facing.x)
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
      for (let k = 0; k < r.tier.count; k++) {
        const radius = (26 + k * 24) * area
        const count = Math.round((TAU * radius) / 16)
        for (let j = 0; j < count; j++) {
          const a = (j / count) * TAU + k * 0.4
          spawnAttack(g, {
            move: 'special', type: r.def.type, visual: 'roots', x: p.x + dm.cos(a) * radius, y: p.y + dm.sin(a) * radius,
            shape: { kind: 'circle', r: 9 * area }, motion: { kind: 'static' },
            damage: dmg, knockback: 30, status: r.def.status ?? null, ttl: 0.8, age: -k * 0.13, flip: chance(g.rng, 0.5),
          })
        }
      }
      return
    }
    case 'nova': {
      for (let i = 0; i < r.tier.count; i++) {
        spawnAttack(g, {
          move: 'special', type: r.def.type, visual: 'nova', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 6 }, motion: { kind: 'follow', ox: 0, oy: -8 },
          damage: dmg, knockback: 240, ttl: 0.45, grow: (95 * area) / 0.45, age: -i * 0.18, status: r.def.status ?? null,
        })
      }
      return
    }
    case 'bolt': return releaseBolts(g, r, area, dmg)
    case 'rain': return releaseRain(g, r, area, dmg)
    case 'ring': {
      for (let i = 0; i < r.tier.count; i++) {
        const v = fromAngle(s.angle + (i / r.tier.count) * TAU, RING_SPEED)
        spawnAttack(g, {
          move: 'special', type: r.def.type, visual: 'orb', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 6 * area }, motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: dmg, knockback: 150, ttl: RING_TTL, status: r.def.status ?? null,
        })
      }
      return
    }
    case 'wave': {
      const dir = fromAngle(s.angle)
      const gap = WAVE_GAP * area
      for (let i = 0; i < r.tier.count; i++) {
        const side = (i - (r.tier.count - 1) / 2) * gap
        // A shallow arc: the outer segments trail slightly behind the middle.
        const back = Math.abs(side) * 0.35
        spawnAttack(g, {
          move: 'special', type: r.def.type, visual: 'wave',
          x: p.x - dir.y * side + dir.x * (10 - back), y: p.y - 8 + dir.x * side + dir.y * (10 - back),
          shape: { kind: 'circle', r: 9 * area }, motion: { kind: 'linear', vx: dir.x * WAVE_SPEED, vy: dir.y * WAVE_SPEED },
          damage: dmg, knockback: 200, ttl: WAVE_TTL, status: r.def.status ?? null,
        })
      }
      return
    }
    case 'trail':
      s.active = r.tier.count * TRAIL_EVERY
      s.trail = TRAIL_EVERY
      return
  }
}

/** Strikes from the sky on the nearest foes in view, one after another; spares scatter around the player. */
const releaseBolts = (g: Game, r: ResolvedSpecial, area: number, dmg: number) => {
  const p = g.player
  const targets = enemiesInView(g)
    .sort((a, b) => dm.sq(a.x - p.x) + dm.sq(a.y - p.y) - (dm.sq(b.x - p.x) + dm.sq(b.y - p.y)))
    .slice(0, r.tier.count)
  for (let i = 0; i < r.tier.count; i++) {
    const e = targets[i]
    const a = range(g.rng, 0, TAU)
    const d = range(g.rng, 30, BOLT_SCATTER)
    const at = BOLT_DELAY + i * BOLT_STAGGER
    spawnAttack(g, {
      move: 'special', type: r.def.type, visual: 'bolt',
      x: e ? e.x : p.x + dm.cos(a) * d, y: e ? e.y - e.radius : p.y + dm.sin(a) * d * 0.8,
      shape: { kind: 'circle', r: 14 * area }, motion: { kind: 'static' },
      damage: dmg, knockback: 120, status: r.def.status ?? null,
      activeFrom: at, activeUntil: at + IMPACT_WINDOW, ttl: at + 0.4,
    })
  }
}

/** Projectiles raining around the player over RAIN_TIME, most of them on foes. */
const releaseRain = (g: Game, r: ResolvedSpecial, area: number, dmg: number) => {
  const p = g.player
  const near = enemiesInView(g).filter((e) => dm.sq(e.x - p.x) + dm.sq(e.y - p.y) < dm.sq(RAIN_RADIUS))
  for (let i = 0; i < r.tier.count; i++) {
    const e = near.length > 0 && chance(g.rng, RAIN_AIMED) ? pick(g.rng, near) : null
    const a = range(g.rng, 0, TAU)
    const d = Math.sqrt(g.rng()) * RAIN_RADIUS
    const at = 0.15 + (i / r.tier.count) * RAIN_TIME
    spawnAttack(g, {
      move: 'special', type: r.def.type, visual: 'meteor',
      x: e ? e.x : p.x + dm.cos(a) * d, y: e ? e.y : p.y + dm.sin(a) * d * 0.8,
      shape: { kind: 'circle', r: 14 * area }, motion: { kind: 'static' },
      damage: dmg, knockback: 160, status: r.def.status ?? null,
      activeFrom: at, activeUntil: at + IMPACT_WINDOW, ttl: at + 0.35, flip: chance(g.rng, 0.5),
    })
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

/** Drops a hazard patch at the player's feet every TRAIL_EVERY seconds while the trail lasts. */
const trailTick = (g: Game, r: ResolvedSpecial, dt: number) => {
  const s = g.special
  const p = g.player
  const area = areaOf(g, r)
  s.trail += dt
  for (; s.trail >= TRAIL_EVERY; s.trail -= TRAIL_EVERY) {
    spawnAttack(g, {
      move: 'special', type: r.def.type, visual: 'puddle', x: p.x + range(g.rng, -3, 3), y: p.y + range(g.rng, -2, 2),
      shape: { kind: 'circle', r: 10 * area }, motion: { kind: 'static' },
      damage: power(g, r) * 0.3, knockback: 0, hitInterval: 0.4, ttl: range(g.rng, 2, 2.6), status: r.def.status ?? null, flip: chance(g.rng, 0.5),
    })
  }
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
    else if (r.def.kind === 'trail') trailTick(g, r, dt)
  }
}
