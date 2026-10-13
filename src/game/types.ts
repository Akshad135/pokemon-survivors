import type { Dir8 } from '../engine/math'
import type { Rng } from '../engine/rng'
import type { Grid } from '../engine/spatial'
import type { EnemyId } from '../data/enemies'
import type { ItemId } from '../data/items'
import type { PokeType } from '../data/types'
import type { StarterId } from '../data/starters'
import type { Ranks } from './meta'
import type { MoveId } from './moves'
import type { PlayerStats } from './stats'

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
  behavior: EnemyBehavior
  dir: Dir8
  animTime: number
  flash: number
  slow: number
  slowUntil: number
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

export type Visual = 'ember' | 'flame' | 'water' | 'leaf' | 'star' | 'thunder' | 'whirlpool' | 'vine' | 'sludge' | 'gust'

/** Any damaging hitbox: projectiles, auras, strikes, zones. */
export type Attack = {
  id: number
  move: MoveId
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
  slow: number
  /** Where it was launched from (lobbed attacks animate from here). */
  from: { x: number; y: number }
  flip: boolean
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
} & ({ kind: 'xp'; value: number } | { kind: 'coin'; value: number } | { kind: 'berry' } | { kind: 'pokeball' })

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

export type FloatText = { x: number; y: number; vy: number; life: number; text: string; color: string }

export type Offer =
  | { kind: 'move'; id: MoveId; level: number }
  | { kind: 'item'; id: ItemId; level: number }
  | { kind: 'berry' }

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
  | { kind: 'thunder' }
  | { kind: 'evolve'; from: number; to: number }
  | { kind: 'evolved'; to: number }
  | { kind: 'pokeball'; offer: Offer | null }
  | { kind: 'gameover' }
  | { kind: 'victory' }

export type Evolution = { from: number; to: number; t: number }

export type Game = {
  starter: StarterId
  rng: Rng
  time: number
  phase: Phase
  nextId: number
  player: Player
  enemies: Enemy[]
  attacks: Attack[]
  pickups: Pickup[]
  particles: Particle[]
  texts: FloatText[]
  grid: Grid
  view: { w: number; h: number }
  camera: { x: number; y: number }
  shake: number
  kills: number
  /** Permanent Poké Mart ranks this run was started with. */
  ranks: Ranks
  /** Poké Dollars collected this run (already multiplied by greed). */
  coins: number
  /** Level-up rerolls/skips left this run. */
  rerolls: number
  skips: number
  damageByMove: Partial<Record<MoveId, number>>
  pendingLevelUps: number
  offers: Offer[]
  evolution: Evolution | null
  spawnBudget: number
  nextEvent: number
  bossId: number | null
  events: GameEvent[]
}
