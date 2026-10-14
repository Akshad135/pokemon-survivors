import type { Dir8 } from '../engine/math'
import type { Rng } from '../engine/rng'
import type { Grid } from '../engine/spatial'
import type { HazardVisual } from '../data/bosses'
import type { EnemyId } from '../data/enemies'
import type { BiomeId, WeatherId } from '../data/biomes'
import type { RiftLegend } from '../data/rifts'
import type { BuffId } from '../data/consumables'
import type { ItemId } from '../data/items'
import type { TraitId } from '../data/traits'
import type { PokeType } from '../data/types'
import type { PlayableId } from '../data/hatchlings'
import type { BiomeState } from './biomes'
import type { Ranks } from './meta'
import type { ConsumableId } from './consumables'
import type { EggTier, RunEggs } from './eggs'
import type { EndlessState } from './endless'
import type { MoveId } from './moves'
import type { MapEventNotice, MapEventsState } from './mapEvents'
import type { Prop } from './props'
import type { Roster } from './roster'
import type { RiftState } from './rift'
import type { SpecialState } from './special'
import type { PlayerStats } from './stats'
import type { EnemyStatus, StatusSpec } from './status'
import type { WeatherState } from './weather'
import type { TraitState } from './traits'

export type OwnedMove = { id: MoveId; level: number; cooldown: number }
export type OwnedItem = { id: ItemId; level: number }

export type Player = {
  x: number
  y: number
  /** Last non-zero movement direction (unit vector). Aimed moves use it. */
  facing: { x: number; y: number }
  dir: Dir8
  moving: boolean
  hp: number
  level: number
  xp: number
  xpNext: number
  /** Seconds of invulnerability left after being hit. */
  iframes: number
  hurt: number
  /** Index into the starter's evolution line. */
  stage: number
  moves: OwnedMove[]
  items: OwnedItem[]
  stats: PlayerStats
  radius: number
  animTime: number
  /** Rolled once per run (or owned from a shiny hatch); the whole evolution line uses shiny sprites. */
  shiny: boolean
  /** Distance walked this run, in world px. Hatches the incubator's eggs (`eggs.ts`). */
  walked: number
}

export type EnemyBehavior =
  | { kind: 'chase' }
  /** Flies in a straight line and despawns after `ttl` (swarm events). */
  | { kind: 'flyby'; vx: number; vy: number; ttl: number }

export type Enemy = {
  id: number
  kind: EnemyId
  types: readonly PokeType[]
  x: number
  y: number
  /** Knockback velocity, decays every tick. */
  kx: number
  ky: number
  hp: number
  maxHp: number
  damage: number
  speed: number
  mass: number
  radius: number
  xp: number
  boss: boolean
  /** Shiny elite: more HP and EXP, drops a Poké Ball. */
  shiny: boolean
  /** Game time it spawned at (sparkle timing). */
  bornAt: number
  /** Seconds until each boss pattern fires, indexed like `BOSS_PATTERNS[kind]`. */
  cooldowns: number[]
  behavior: EnemyBehavior
  dir: Dir8
  animTime: number
  flash: number
  /** Status conditions (burn, poison, paralysis, slow). */
  status: EnemyStatus
  /** Behavior trait (healer, kamikaze…) and the wards/heals it gets from allies. */
  trait: TraitState
  /** -1 while alive; otherwise seconds since fainting. */
  dying: number
}

export type Shape = { kind: 'circle'; r: number } | { kind: 'rect'; w: number; h: number }

export type Motion =
  | { kind: 'linear'; vx: number; vy: number }
  | { kind: 'homing'; vx: number; vy: number; speed: number; turn: number; target: Enemy | null }
  | { kind: 'orbit'; angle: number; spin: number; radius: number }
  /** Flies out along (vx, vy) and gets pulled back by (ax, ay). */
  | { kind: 'boomerang'; vx: number; vy: number; ax: number; ay: number }
  /** Stays glued to the player at an offset. */
  | { kind: 'follow'; ox: number; oy: number }
  | { kind: 'static' }

export type Visual =
  | 'ember' | 'flame' | 'water' | 'leaf' | 'star' | 'thunder' | 'whirlpool' | 'vine' | 'sludge' | 'gust'
  | 'fist' | 'steel' | 'arrow' | 'shuriken' | 'jaws' | 'pyro' | 'psy' | 'quake' | 'drumRoots' | 'heart' | 'note' | 'blade' | 'shell'
  /** Special attacks (`special.ts`), drawn by `render/specialFx.ts`. */
  | 'blitz' | 'fireTrail' | 'blast' | 'beam' | 'roots' | 'nova'
  | EvolvedVisual

/** What dealt the damage, for the results screen. */
export type DamageSource = MoveId | 'special'

/** Visuals of evolved moves, drawn by `render/evolved.ts`. */
export type EvolvedVisual =
  | 'flamethrower' | 'fireBlast' | 'hydroPump' | 'surf' | 'leafStorm'
  | 'powerWhip' | 'triAttack' | 'wildbolt' | 'gunk' | 'hurricane'

/** Any damaging hitbox: projectiles, auras, strikes, zones. */
export type Attack = {
  id: number
  move: DamageSource
  type: PokeType
  visual: Visual
  x: number
  y: number
  shape: Shape
  motion: Motion
  damage: number
  knockback: number
  /** Remaining enemies it can hit before vanishing. */
  pierce: number
  /** Seconds before the same enemy can be hit again (Infinity = once). */
  hitInterval: number
  hits: Map<number, number>
  age: number
  ttl: number
  /** Damage window, in seconds of age. */
  activeFrom: number
  activeUntil: number
  /** Radius growth per second (expanding rings). */
  grow: number
  /** Condition this hitbox may inflict on hit. */
  status: StatusSpec | null
  /** Where it was launched from (lobbed attacks animate from here). */
  from: { x: number; y: number }
  flip: boolean
}

/** Enemy-owned hitbox that hurts the player (boss attacks). */
export type Hazard = {
  id: number
  /** strike = telegraphed impact, shot = projectile, zone = lingering patch. */
  kind: 'strike' | 'shot' | 'zone'
  visual: HazardVisual
  x: number
  y: number
  vx: number
  vy: number
  r: number
  damage: number
  age: number
  /** Harmless telegraph until `armAt`; can hurt until `disarmAt`. */
  armAt: number
  disarmAt: number
  ttl: number
  /** Projectiles vanish on hit; zones linger. */
  vanishOnHit: boolean
}

export type Pickup = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  /** True once it's being pulled into the player. */
  attracted: boolean
  age: number
} & ({ kind: 'xp'; value: number } | { kind: 'coin'; value: number } | { kind: 'berry' } | { kind: 'pokeball' } | { kind: 'consumable'; item: ConsumableId })

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  ttl: number
  color: string
  size: number
  gravity: number
  drag: number
}

/** `damage` marks damage numbers, which the settings can hide (heals and ₽ always show). */
export type FloatText = { x: number; y: number; vy: number; life: number; text: string; color: string; damage: boolean }

export type Offer =
  | { kind: 'move'; id: MoveId; level: number }
  | { kind: 'item'; id: ItemId; level: number }
  | { kind: 'berry' }
  /** Max level move + its paired held item: the move evolves in place. */
  | { kind: 'evolution'; from: MoveId; to: MoveId }

export type Phase = 'playing' | 'levelup' | 'evolving' | 'paused' | 'gameover' | 'victory'

/** Fire-and-forget notifications for audio/UI. Drained by the shell every frame. */
export type GameEvent =
  | { kind: 'hit'; effective: number }
  | { kind: 'kill'; boss: boolean }
  | { kind: 'pickup' }
  | { kind: 'coin' }
  | { kind: 'heal' }
  | { kind: 'hurt' }
  | { kind: 'levelup' }
  | { kind: 'boss'; enemy: EnemyId }
  | { kind: 'shiny'; enemy: EnemyId }
  | { kind: 'shinyPlayer' }
  | { kind: 'thunder' }
  | { kind: 'quake' }
  /** The special attack started charging or was unleashed. */
  | { kind: 'special'; phase: 'charge' | 'release'; name: string }
  | { kind: 'evolve'; from: number; to: number }
  | { kind: 'evolved'; to: number }
  | { kind: 'pokeball'; offer: Offer | null }
  | { kind: 'moveEvolved'; from: MoveId; to: MoveId }
  | { kind: 'gameover' }
  | { kind: 'consumable'; item: ConsumableId }
  | { kind: 'propBreak' }
  | { kind: 'revive' }
  | { kind: 'victory' }
  /** The run walked into another biome. */
  | { kind: 'biome'; biome: BiomeId }
  | { kind: 'weather'; weather: WeatherId; prev: WeatherId }
  /** An enemy trait warned (fuse lit, beam aimed, leap started) or went off. */
  | { kind: 'trait'; trait: TraitId; phase: 'warn' | 'fire' }
  /** First time a trait shows up on screen this run (one-time explainer toast). */
  | { kind: 'traitIntro'; enemy: EnemyId; trait: TraitId }
  /** Something happened at a map event (altar, chest, Meowth…). */
  | { kind: 'mapEvent'; notice: MapEventNotice }
  /** Legendary rifts: a portal opened or closed unused, the player stepped in, won, or came back. */
  | { kind: 'riftOpen' }
  | { kind: 'riftClosed' }
  | { kind: 'riftEnter'; enemy: RiftLegend; shiny: boolean }
  | { kind: 'riftCleared'; enemy: RiftLegend; shiny: boolean }
  | { kind: 'riftExit'; outcome: 'won' | 'collapse' }
  /** Endless mode: Arceus arrived (`defeats` so far) or fell. */
  | { kind: 'reaper'; defeats: number }
  | { kind: 'reaperDown'; defeats: number }
  /** A boss, chest or rift left an egg; it goes to the incubator when the run is banked. */
  | { kind: 'egg'; tier: EggTier }

/** A timed player buff (X Attack, X Speed, Max Repel). `left` counts down in seconds. */
export type Buff = { id: BuffId; left: number; total: number }

export type Evolution = { from: number; to: number; t: number }

export type Game = {
  /** The Pokémon this run plays: a starter or a hatched family. */
  starter: PlayableId
  rng: Rng
  time: number
  phase: Phase
  nextId: number
  player: Player
  enemies: Enemy[]
  attacks: Attack[]
  hazards: Hazard[]
  pickups: Pickup[]
  particles: Particle[]
  texts: FloatText[]
  grid: Grid
  view: { w: number; h: number }
  camera: { x: number; y: number }
  shake: number
  /** Seconds the simulation stays frozen for impact (hit-stop). */
  hitstop: number
  special: SpecialState
  kills: number
  /** Permanent Poké Mart ranks this run was started with. */
  ranks: Ranks
  /** Poké Dollars collected this run (already multiplied by greed). */
  coins: number
  /** Level-up rerolls/skips left this run. */
  rerolls: number
  skips: number
  damageByMove: Partial<Record<DamageSource, number>>
  pendingLevelUps: number
  offers: Offer[]
  evolution: Evolution | null
  /** This run's wild cast, drawn at the start (`game/roster.ts`). */
  roster: Roster
  spawnBudget: number
  nextEvent: number
  bossId: number | null
  /** Breakable item sources (item balls, berry trees, tall grass) near the player. */
  props: Prop[]
  /** World cells whose prop was already broken, so it never respawns. */
  brokenProps: Set<number>
  buffs: Buff[]
  /** Points of interest placed by the event director (`mapEvents.ts`). */
  mapEvents: MapEventsState
  /** Revives held (0 or 1). Auto-used on fainting. */
  revives: number
  /** Full-screen white flash strength (Explosion), decays to 0. */
  flash: number
  /** Biome the run is in (`game/biomes.ts`). */
  biome: BiomeState
  /** Weather in play (`game/weather.ts`). */
  weather: WeatherState
  /** Enemy traits already introduced this run (each gets one explainer toast), and the game time the next one may show. */
  traits: { seen: Set<TraitId>; nextIntro: number }
  /** Legendary rifts: the portal on the map, the arena and what was met this run. */
  rift: RiftState
  /** Set once the player goes on past Mewtwo (endless mode). */
  endless: EndlessState | null
  /** Eggs found this run (`eggs.ts`). */
  eggs: RunEggs
  events: GameEvent[]
}
