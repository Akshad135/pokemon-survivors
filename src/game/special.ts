import { dir8, dirTo, fromAngle, TAU } from '../engine/math'
import { chance, pick, range } from '../engine/rng'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import { TYPE_COLORS, type PokeType } from '../data/types'
import { burst } from './effects'
import { recomputeStats } from './leveling'
import { enemiesInView, inView, isAlive } from './queries'
import { spawnAttack } from './spawn'
import { FIRST_STANCE, otherStance, STANCES, type Stance } from './stance'
import type { StatusSpec } from './status'
import type { PlayerStats } from './stats'
import type { Enemy, Game } from './types'
import * as dm from '../engine/dmath'

/**
 * The manual special attack (Space / touch button / gamepad A). Each of the 18
 * types has one, as data: a form (`SpecialKind`) tuned by its tiers, plus the
 * type's color and condition. Fire, Water and Grass keep their bespoke forms;
 * the rest share six parametrized ones (bolt, nova, rain, ring, wave, trail).
 * Per-species overrides can win over the type (the agile lines' chain dash,
 * Aegislash's Stance Change). The final evolution stage swaps in the stronger tier.
 */

/**
 * How the special plays out once the charge ends.
 * - dash: flaming charge with a fire trail · beam: aimed jet · roots: rings of roots
 * - nova: shock waves around the player · bolt: strikes from the sky on the nearest foes
 * - rain: projectiles falling around the player · ring: a volley fired all around
 * - wave: an aimed wall sweeping forward · trail: hazard patches left behind while moving
 * - chain: lunges into the nearest foe; each landing opens a short window to jump to the next
 * - stance: swaps Aegislash between Shield and Blade Forme (`stance.ts`), no damage
 */
export type SpecialKind = 'dash' | 'beam' | 'roots' | 'nova' | 'bolt' | 'rain' | 'ring' | 'wave' | 'trail' | 'chain' | 'stance'

type SpecialTier = {
  name: string
  damage: number
  area: number
  /**
   * How many pieces the form makes: rings of roots, shock waves, bolts, falling
   * projectiles, projectiles in the ring, wave segments, trail patches or the
   * jumps a chain dash can make. Dash, beam and stance ignore it.
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
  /* Chain dashes, given per species (`BY_SPECIES`). The cooldown starts when the chain ends. */
  solarBlade: {
    type: 'grass', kind: 'chain', cooldown: 8, charge: 0,
    base: { name: 'Leaf Blade', damage: 24, area: 1, count: 3 },
    final: { name: 'Solar Blade', damage: 40, area: 1.2, count: 4 },
  },
  closeCombat: {
    type: 'fighting', kind: 'chain', cooldown: 8, charge: 0,
    base: { name: 'Force Palm', damage: 24, area: 1, count: 3 },
    final: { name: 'Close Combat', damage: 40, area: 1.2, count: 4 },
  },
  dragonRush: {
    type: 'dragon', kind: 'chain', cooldown: 8, charge: 0,
    base: { name: 'Dual Chop', damage: 26, area: 1, count: 3 },
    final: { name: 'Dragon Rush', damage: 44, area: 1.25, count: 4 },
  },
  braveBird: {
    type: 'flying', kind: 'chain', cooldown: 8, charge: 0,
    base: { name: 'Aerial Ace', damage: 22, area: 1, count: 3 },
    final: { name: 'Brave Bird', damage: 38, area: 1.2, count: 4 },
  },
  ironHead: {
    type: 'steel', kind: 'chain', cooldown: 8, charge: 0,
    base: { name: 'Smart Strike', damage: 24, area: 1, count: 3 },
    final: { name: 'Iron Head', damage: 40, area: 1.2, count: 4 },
  },
  /** Aegislash only: swaps formes on a short, fixed cooldown (the floor doesn't apply). */
  stanceChange: {
    type: 'steel', kind: 'stance', cooldown: 2, charge: 0,
    base: { name: 'Stance Change', damage: 0, area: 1, count: 1 },
    final: { name: 'Stance Change', damage: 0, area: 1, count: 1 },
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

/**
 * Per-species overrides win over the type table: one special for the whole
 * line, or one per evolution stage (the last entry holds for later stages).
 * The agile lines dash in chains; Aegislash swaps stances instead.
 */
const BY_SPECIES: Partial<Record<PlayableId, SpecialId | readonly SpecialId[]>> = {
  treecko: 'solarBlade',
  sprigatito: 'solarBlade',
  riolu: 'closeCombat',
  gible: 'dragonRush',
  starly: 'braveBird',
  honedge: ['ironHead', 'ironHead', 'stanceChange'],
}

export const specialOfType = (type: PokeType): SpecialId => BY_TYPE[type]

/** Species override at that stage, else the special of its first type. */
export const specialIdFor = (species: PlayableId, types: readonly PokeType[], stage = 0): SpecialId => {
  const own = BY_SPECIES[species]
  const fallback = specialOfType(types[0] ?? 'normal')
  if (own === undefined) return fallback
  return typeof own === 'string' ? own : (own[Math.min(stage, own.length - 1)] ?? fallback)
}

export const resolveSpecial = (starter: PlayableId, stage: number) => {
  const species = PLAYABLE[starter]
  const id = specialIdFor(starter, species.line[0].types, stage)
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
  /** Distance dashed (dash, chain) or seconds walked (trail) since the last trail patch or afterimage. */
  trail: number
  /** Chain dash: a chain is running, from its first jump until its cooldown starts. */
  chaining: boolean
  /** Chain dash: jumps left in the running chain. */
  jumps: number
  /** Chain dash: seconds left to press for the next jump (opens when a jump lands on a foe). */
  window: number
  /** Chain dash: px the current jump covers. */
  reach: number
  /** Chain dash: id of the foe the last jump went for (-1 for none), skipped by the next jump. */
  target: number
  /** Stance Change: Aegislash's forme; null for every other special. */
  stance: Stance | null
}

export const SPECIAL_BUFFER = 0.25
export const MIN_SPECIAL_COOLDOWN = 4

export const createSpecialState = (): SpecialState => ({
  cooldown: 0, total: 1, buffer: 0, charge: 0, active: 0, angle: 0, trail: 0,
  chaining: false, jumps: 0, window: 0, reach: 0, target: -1, stance: null,
})

type Timers = Pick<SpecialState, 'cooldown' | 'buffer' | 'charge' | 'active'>

export const specialBusy = (s: Timers) => s.charge > 0 || s.active > 0
export const specialReady = (s: Timers) => s.cooldown <= 0 && !specialBusy(s)

/** Seconds of cooldown after a use: scaled by the cooldown stat down to the floor. Stance Change keeps its own short one. */
export const specialCooldown = (def: SpecialDef, stats: PlayerStats) =>
  def.kind === 'stance' ? def.cooldown : Math.max(MIN_SPECIAL_COOLDOWN, def.cooldown * stats.cooldown)

/** Ticks the cooldown and input buffer. True on the tick a (possibly buffered) press should start the special. */
export const triggerSpecial = (s: Timers, pressed: boolean, dt: number) => {
  s.cooldown = Math.max(0, s.cooldown - dt)
  s.buffer = pressed ? SPECIAL_BUFFER : Math.max(0, s.buffer - dt)
  if (s.buffer <= 0 || !specialReady(s)) return false
  s.buffer = 0
  return true
}

/* ---------------- Chain dash timers (pure) ---------------- */

/** After a jump lands on a foe, a press within this many seconds jumps again. */
export const CHAIN_WINDOW = 0.5
/**
 * Invulnerability per jump. Well under the 4 s cooldown floor and under the
 * 0.5 s a hit already grants, so chaining never adds up to permanent i-frames.
 */
export const CHAIN_IFRAMES = 0.3

type ChainTimers = Pick<SpecialState, 'cooldown' | 'total' | 'chaining' | 'jumps' | 'window'>

/** Spends one jump, opening a chain of `count` jumps on its first press. No cooldown yet. */
export const beginJump = (s: ChainTimers, count: number) => {
  if (!s.chaining) {
    s.chaining = true
    s.jumps = count
  }
  s.jumps = Math.max(0, s.jumps - 1)
  s.window = 0
}

/** Ends the chain: only now does the cooldown start. */
export const endChain = (s: ChainTimers, cooldown: number) => {
  s.chaining = false
  s.jumps = 0
  s.window = 0
  s.cooldown = s.total = cooldown
}

/** A jump landed: on a foe with jumps left it opens the window for the next press, otherwise the chain ends. */
export const landJump = (s: ChainTimers, hit: boolean, cooldown: number) => {
  if (hit && s.jumps > 0) s.window = CHAIN_WINDOW
  else endChain(s, cooldown)
}

/** Counts the window down between jumps; the chain ends when it runs out. */
export const tickChain = (s: ChainTimers, dt: number, cooldown: number) => {
  if (s.window <= 0) return
  s.window = Math.max(0, s.window - dt)
  if (s.window <= 0) endChain(s, cooldown)
}

/**
 * Player speed multiplier: slower while charging and beaming, 0 while dashing
 * (the dash or lunge moves the player) and a little faster while laying a trail.
 */
export const specialSpeedFactor = (g: Game) => {
  const s = g.special
  if (s.charge > 0) return 0.45
  if (s.active <= 0) return 1
  const kind = resolveSpecial(g.starter, g.player.stage).def.kind
  return kind === 'dash' || kind === 'chain' ? 0 : kind === 'trail' ? TRAIL_SPEED : 0.3
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
/** Chain dash: lunge seconds, how far it looks for a foe, how far past it it lands, and the dash with no foe in reach. */
const CHAIN_TIME = 0.1
const CHAIN_RANGE = 170
const CHAIN_OVERSHOOT = 10
const CHAIN_MISS = 70
/** Spacing of the capsule's circles and of the afterimages, in px. */
const CHAIN_STEP = 8
const CHAIN_GHOST = 14
/** Share of the power dealt along the path and by the slash at the landing. */
const CHAIN_PATH = 0.6
const CHAIN_SLASH = 1

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
    // Chain and stance never charge: `updateSpecial` runs them on the press.
    case 'chain':
    case 'stance':
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

/* ---------------- Chain dash ---------------- */

/** Nearest living foe on screen within reach of a jump, skipping the one the last jump went for. */
const chainTarget = (g: Game, skip: number) => {
  const p = g.player
  let best: Enemy | null = null
  let bestD = dm.sq(CHAIN_RANGE)
  for (const e of g.enemies) {
    if (!isAlive(e) || e.id === skip || !inView(g, e.x, e.y, -8)) continue
    const d = dm.sq(e.x - p.x) + dm.sq(e.y - p.y)
    if (d < bestD) {
      bestD = d
      best = e
    }
  }
  return best
}

/**
 * One jump: aims at the nearest foe (or dashes ahead when none is in reach)
 * and lays the capsule along the path, stepped circles that switch on as the
 * player passes and share one hit list, so each foe on the path is hit once.
 */
const startJump = (g: Game, r: ResolvedSpecial) => {
  const s = g.special
  const p = g.player
  const first = !s.chaining
  beginJump(s, r.tier.count)
  const foe = chainTarget(g, s.target)
  const dir = foe ? dirTo(p.x, p.y, foe.x, foe.y, p.facing) : p.facing
  s.reach = foe ? dm.hypot(foe.x - p.x, foe.y - p.y) + CHAIN_OVERSHOOT : CHAIN_MISS
  s.angle = dm.atan2(dir.y, dir.x)
  s.target = foe ? foe.id : -1
  s.active = CHAIN_TIME
  s.trail = 0
  p.iframes = Math.max(p.iframes, CHAIN_IFRAMES)
  if (first) g.events.push({ kind: 'special', phase: 'charge', name: r.tier.name })

  const area = areaOf(g, r)
  const dmg = power(g, r) * CHAIN_PATH
  const hits = new Map<number, number>()
  const speed = s.reach / CHAIN_TIME
  const from = { x: p.x, y: p.y - 8 }
  for (let d = 0; d <= s.reach; d += CHAIN_STEP) {
    const at = d / speed
    spawnAttack(g, {
      move: 'special', type: r.def.type, visual: 'streak', x: from.x + dir.x * d, y: from.y + dir.y * d,
      shape: { kind: 'circle', r: 11 * area }, motion: { kind: 'static' }, hits, from,
      damage: dmg, knockback: 90, status: r.def.status ?? null, activeFrom: at, activeUntil: at + 0.05, ttl: at + 0.25,
    })
  }
  burst(g, p.x, p.y - 10, { colors: typeColors(r.def.type), count: 10, speed: 70, ttl: 0.25 })
}

/** Moves the player `moved` px along the jump, leaving afterimages behind (cosmetic: never active). */
const lungeTick = (g: Game, r: ResolvedSpecial, moved: number) => {
  const s = g.special
  const p = g.player
  const dir = fromAngle(s.angle)
  p.x += dir.x * moved
  p.y += dir.y * moved
  p.dir = dir8(dir.x, dir.y)
  s.trail += moved
  for (; s.trail >= CHAIN_GHOST; s.trail -= CHAIN_GHOST) {
    const back = s.trail - CHAIN_GHOST
    spawnAttack(g, {
      move: 'special', type: r.def.type, visual: 'afterimage', x: p.x - dir.x * back, y: p.y - dir.y * back,
      shape: { kind: 'circle', r: 1 }, motion: { kind: 'static' }, damage: 0, activeFrom: Infinity, ttl: 0.3,
    })
  }
}

/** The landing: a slash where the jump ends, a screen kick, then the window for the next jump (or the cooldown). */
const landChain = (g: Game, r: ResolvedSpecial, cooldown: number) => {
  const s = g.special
  const p = g.player
  const hit = s.target >= 0
  const area = areaOf(g, r)
  const back = fromAngle(s.angle, 12)
  spawnAttack(g, {
    move: 'special', type: r.def.type, visual: 'slash', x: p.x, y: p.y - 8,
    shape: { kind: 'circle', r: 22 * area }, motion: { kind: 'static' }, from: { x: p.x - back.x, y: p.y - 8 - back.y },
    damage: power(g, r) * CHAIN_SLASH, knockback: 220, status: r.def.status ?? null, activeUntil: 0.07, ttl: 0.3, flip: chance(g.rng, 0.5),
  })
  burst(g, p.x, p.y - 8, { colors: typeColors(r.def.type), count: hit ? 18 : 8, speed: hit ? 130 : 80, ttl: 0.3 })
  g.shake = Math.max(g.shake, hit ? 4 : 2)
  if (hit) {
    g.hitstop = Math.max(g.hitstop, 0.03)
    g.events.push({ kind: 'special', phase: 'release', name: r.tier.name })
  }
  landJump(s, hit, cooldown)
}

/**
 * Chain dash each tick: the window counts down between jumps, a (buffered)
 * press when ready or inside the window jumps, and the lunge runs its course.
 */
const updateChain = (g: Game, r: ResolvedSpecial, pressed: boolean, dt: number) => {
  const s = g.special
  const cooldown = specialCooldown(r.def, g.player.stats)
  if (s.active <= 0) tickChain(s, dt, cooldown)
  if (triggerSpecial(s, pressed, dt)) startJump(g, r)
  if (s.active <= 0) return
  const moved = (s.reach / CHAIN_TIME) * Math.min(dt, s.active)
  s.active = Math.max(0, s.active - dt)
  lungeTick(g, r, moved)
  if (s.active <= 0) landChain(g, r, cooldown)
}

/* ---------------- Stance Change ---------------- */

/** Keeps the stance in step with the special: Shield when Aegislash arrives, none for anyone else. */
const syncStance = (g: Game, r: ResolvedSpecial) => {
  const want = r.def.kind === 'stance' ? (g.special.stance ?? FIRST_STANCE) : null
  if (want === g.special.stance) return
  g.special.stance = want
  recomputeStats(g)
}

const swapStance = (g: Game) => {
  const s = g.special
  const p = g.player
  const stance = otherStance(s.stance ?? FIRST_STANCE)
  s.stance = stance
  recomputeStats(g)
  g.events.push({ kind: 'stance', stance })
  burst(g, p.x, p.y - 12, { colors: [STANCES[stance].color, '#ffffff', '#f8d030'], count: 24, speed: 110, ttl: 0.35 })
  g.shake = Math.max(g.shake, 2)
}

/** Runs the special each tick: trigger → charge → release → active phase. */
export const updateSpecial = (g: Game, pressed: boolean, dt: number) => {
  const s = g.special
  const r = resolveSpecial(g.starter, g.player.stage)
  syncStance(g, r)
  if (r.def.kind === 'chain') return updateChain(g, r, pressed, dt)
  // An evolution can swap the chain out mid-window.
  if (s.chaining) endChain(s, specialCooldown(r.def, g.player.stats))
  if (triggerSpecial(s, pressed, dt)) {
    s.cooldown = s.total = specialCooldown(r.def, g.player.stats)
    if (r.def.kind === 'stance') return swapStance(g)
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
