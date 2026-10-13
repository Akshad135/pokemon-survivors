import { dirTo, fromAngle, TAU } from '../engine/math'
import { pick, range } from '../engine/rng'
import type { PokeType } from '../data/types'
import { spawnAttack } from './spawn'
import { enemiesInView, nearestEnemy } from './queries'
import type { Game } from './types'
import type { PlayerStats } from './stats'

/**
 * Moves are the weapons. Each level-up upgrade adds a delta to the move's
 * base stats; player-wide stats (might, area…) are applied on top in `moveStats`.
 */
export type MoveStats = {
  damage: number
  /** seconds between casts */
  cooldown: number
  /** size multiplier */
  area: number
  /** projectiles per cast */
  amount: number
  /** px/s (or rad/s for orbiting moves) */
  speed: number
  /** seconds, for lingering effects */
  duration: number
  pierce: number
  knockback: number
}

type Upgrade = { text: string; delta: Partial<MoveStats> }

export type MoveDef = {
  name: string
  type: PokeType
  description: string
  base: MoveStats
  upgrades: readonly Upgrade[]
  fire: (g: Game, s: MoveStats) => void
}

const stats = (s: Partial<MoveStats>): MoveStats => ({
  damage: 0, cooldown: 1, area: 1, amount: 1, speed: 0, duration: 1, pierce: Infinity, knockback: 0, ...s,
})

/** Angles spread evenly around `center`, `step` radians apart. */
const fan = (center: number, count: number, step: number) =>
  Array.from({ length: count }, (_, i) => center + (i - (count - 1) / 2) * step)

const aimAngle = (g: Game, range: number) => {
  const p = g.player
  const target = nearestEnemy(g, p.x, p.y, range)
  const d = target ? dirTo(p.x, p.y, target.x, target.y) : p.facing
  return Math.atan2(d.y, d.x)
}

export const MOVES = {
  ember: {
    name: 'Ember',
    type: 'fire',
    description: 'Dispara brasas no inimigo mais próximo.',
    base: stats({ damage: 10, cooldown: 1, amount: 1, speed: 190, pierce: 1, knockback: 40 }),
    upgrades: [
      { text: '+1 brasa', delta: { amount: 1 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: 'Recarga 15% mais rápida', delta: { cooldown: -0.15 } },
      { text: '+1 brasa', delta: { amount: 1 } },
      { text: 'Atravessa +1 inimigo', delta: { pierce: 1 } },
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+1 brasa e +25% de área', delta: { amount: 1, area: 0.25 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of fan(aimAngle(g, 280), s.amount, 0.2)) {
        const v = fromAngle(angle, s.speed)
        spawnAttack(g, {
          move: 'ember', type: 'fire', visual: 'ember', x: p.x, y: p.y - 6,
          shape: { kind: 'circle', r: 4 * s.area },
          motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 1.6,
        })
      }
    },
  },

  fireSpin: {
    name: 'Fire Spin',
    type: 'fire',
    description: 'Chamas giram ao seu redor.',
    base: stats({ damage: 9, cooldown: 3.4, amount: 2, speed: 3.4, duration: 2.6, knockback: 30 }),
    upgrades: [
      { text: '+1 chama', delta: { amount: 1 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: 'Dura +0.6s', delta: { duration: 0.6 } },
      { text: '+1 chama', delta: { amount: 1 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+1 chama e gira mais rápido', delta: { amount: 1, speed: 1 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (let i = 0; i < s.amount; i++) {
        spawnAttack(g, {
          move: 'fireSpin', type: 'fire', visual: 'flame', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 7 * s.area },
          motion: { kind: 'orbit', angle: (i / s.amount) * TAU, spin: s.speed, radius: 36 * s.area },
          damage: s.damage, knockback: s.knockback, hitInterval: 0.45, ttl: s.duration,
        })
      }
    },
  },

  waterGun: {
    name: 'Water Gun',
    type: 'water',
    description: 'Jato d’água que atravessa inimigos na direção em que você anda.',
    base: stats({ damage: 8, cooldown: 0.75, amount: 1, speed: 290, pierce: 2, knockback: 60 }),
    upgrades: [
      { text: '+1 jato', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Atravessa +1 inimigo', delta: { pierce: 1 } },
      { text: 'Recarga 0.1s mais rápida', delta: { cooldown: -0.1 } },
      { text: '+1 jato', delta: { amount: 1 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+1 jato e atravessa +2', delta: { amount: 1, pierce: 2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const angle = Math.atan2(p.facing.y, p.facing.x)
      for (let i = 0; i < s.amount; i++) {
        const v = fromAngle(angle + range(g.rng, -0.08, 0.08), s.speed)
        spawnAttack(g, {
          move: 'waterGun', type: 'water', visual: 'water', x: p.x, y: p.y - 6,
          shape: { kind: 'circle', r: 5 * s.area },
          motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 0.9,
          age: -i * 0.08,
        })
      }
    },
  },

  whirlpool: {
    name: 'Whirlpool',
    type: 'water',
    description: 'Redemoinho constante que machuca e desacelera quem chega perto.',
    base: stats({ damage: 5, cooldown: 0.6, knockback: 14 }),
    upgrades: [
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+2 de dano', delta: { damage: 2 } },
      { text: 'Acerta mais rápido', delta: { cooldown: -0.08 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Acerta mais rápido', delta: { cooldown: -0.08 } },
      { text: '+25% de área e +3 de dano', delta: { area: 0.25, damage: 3 } },
    ],
    // Persistent aura: each "cast" refreshes the single live hitbox with current stats.
    fire: (g, s) => {
      const radius = 34 * s.area
      const aura = g.attacks.find((a) => a.move === 'whirlpool')
      if (aura) {
        aura.shape = { kind: 'circle', r: radius }
        aura.damage = s.damage
        aura.hitInterval = s.cooldown
        aura.knockback = s.knockback
        return
      }
      spawnAttack(g, {
        move: 'whirlpool', type: 'water', visual: 'whirlpool', x: g.player.x, y: g.player.y,
        shape: { kind: 'circle', r: radius },
        motion: { kind: 'follow', ox: 0, oy: 0 },
        damage: s.damage, knockback: s.knockback, hitInterval: s.cooldown, ttl: Infinity, slow: 0.4,
      })
    },
  },

  razorLeaf: {
    name: 'Razor Leaf',
    type: 'grass',
    description: 'Folhas afiadas vão e voltam como bumerangue.',
    base: stats({ damage: 11, cooldown: 1.5, amount: 1, speed: 210, duration: 1, knockback: 25 }),
    upgrades: [
      { text: '+1 folha', delta: { amount: 1 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 folha', delta: { amount: 1 } },
      { text: 'Folhas 25% mais rápidas', delta: { speed: 52 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+1 folha', delta: { amount: 1 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of fan(aimAngle(g, 220), s.amount, 0.45)) {
        const d = fromAngle(angle)
        spawnAttack(g, {
          move: 'razorLeaf', type: 'grass', visual: 'leaf', x: p.x, y: p.y - 6,
          shape: { kind: 'circle', r: 6 * s.area },
          motion: { kind: 'boomerang', vx: d.x * s.speed, vy: d.y * s.speed, ax: -d.x * s.speed * 1.5, ay: -d.y * s.speed * 1.5 },
          damage: s.damage, knockback: s.knockback, hitInterval: 0.6, ttl: 2.2 * s.duration,
        })
      }
    },
  },

  vineWhip: {
    name: 'Vine Whip',
    type: 'grass',
    description: 'Chicotada horizontal com cipós. Alcance longo.',
    base: stats({ damage: 14, cooldown: 1.3, amount: 1, knockback: 70 }),
    upgrades: [
      { text: 'Também ataca atrás', delta: { amount: 1 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: 'Recarga 0.15s mais rápida', delta: { cooldown: -0.15 } },
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+8 de dano', delta: { damage: 8 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const side = p.facing.x < 0 ? -1 : 1
      const w = 72 * s.area
      const h = 14 * s.area
      for (let i = 0; i < s.amount; i++) {
        const dir = i % 2 === 0 ? side : -side
        spawnAttack(g, {
          move: 'vineWhip', type: 'grass', visual: 'vine', x: p.x, y: p.y,
          shape: { kind: 'rect', w, h },
          motion: { kind: 'follow', ox: dir * (w / 2 + 4), oy: -6 - Math.floor(i / 2) * 12 },
          damage: s.damage, knockback: s.knockback, ttl: 0.24, flip: dir < 0,
          age: -i * 0.1,
        })
      }
    },
  },

  swift: {
    name: 'Swift',
    type: 'normal',
    description: 'Estrelas teleguiadas que nunca erram.',
    base: stats({ damage: 7, cooldown: 1.25, amount: 2, speed: 170, pierce: 1, knockback: 20 }),
    upgrades: [
      { text: '+1 estrela', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Recarga 15% mais rápida', delta: { cooldown: -0.18 } },
      { text: '+1 estrela', delta: { amount: 1 } },
      { text: 'Atravessa +1 inimigo', delta: { pierce: 1 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+2 estrelas', delta: { amount: 2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const taken = new Set<number>()
      for (let i = 0; i < s.amount; i++) {
        const target = nearestEnemy(g, p.x, p.y, 320, taken)
        if (target) taken.add(target.id)
        const v = fromAngle(range(g.rng, 0, TAU), s.speed)
        spawnAttack(g, {
          move: 'swift', type: 'normal', visual: 'star', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 5 * s.area },
          motion: { kind: 'homing', vx: v.x, vy: v.y, speed: s.speed, turn: 7, target },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 2.5,
        })
      }
    },
  },

  thunder: {
    name: 'Thunder',
    type: 'electric',
    description: 'Raios caem sobre inimigos aleatórios na tela.',
    base: stats({ damage: 22, cooldown: 2.6, amount: 2, knockback: 10 }),
    upgrades: [
      { text: '+1 raio', delta: { amount: 1 } },
      { text: '+8 de dano', delta: { damage: 8 } },
      { text: '+25% de área', delta: { area: 0.25 } },
      { text: '+1 raio', delta: { amount: 1 } },
      { text: 'Recarga 0.3s mais rápida', delta: { cooldown: -0.3 } },
      { text: '+10 de dano', delta: { damage: 10 } },
      { text: '+2 raios', delta: { amount: 2 } },
    ],
    fire: (g, s) => {
      const targets = enemiesInView(g)
      if (targets.length === 0) return
      for (let i = 0; i < s.amount; i++) {
        const t = pick(g.rng, targets)
        spawnAttack(g, {
          move: 'thunder', type: 'electric', visual: 'thunder', x: t.x, y: t.y,
          shape: { kind: 'circle', r: 16 * s.area },
          motion: { kind: 'static' },
          damage: s.damage, knockback: s.knockback, ttl: 0.5, activeFrom: 0.22, activeUntil: 0.3,
          age: -i * 0.12,
        })
      }
      g.events.push({ kind: 'thunder' })
    },
  },

  sludgeBomb: {
    name: 'Sludge Bomb',
    type: 'poison',
    description: 'Arremessa lodo tóxico que deixa uma poça venenosa.',
    base: stats({ damage: 6, cooldown: 3.6, amount: 1, duration: 2.6 }),
    upgrades: [
      { text: '+1 bomba', delta: { amount: 1 } },
      { text: '+2 de dano', delta: { damage: 2 } },
      { text: 'Poça dura +0.6s', delta: { duration: 0.6 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 bomba', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: '+1 bomba e +20% de área', delta: { amount: 1, area: 0.2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const nearby = enemiesInView(g).filter((e) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 130 ** 2)
      for (let i = 0; i < s.amount; i++) {
        const t = nearby.length > 0 ? pick(g.rng, nearby) : { x: p.x + range(g.rng, -80, 80), y: p.y + range(g.rng, -60, 60) }
        spawnAttack(g, {
          move: 'sludgeBomb', type: 'poison', visual: 'sludge', x: t.x, y: t.y,
          shape: { kind: 'circle', r: 22 * s.area },
          motion: { kind: 'static' },
          damage: s.damage, hitInterval: 0.45, ttl: 0.4 + s.duration, activeFrom: 0.4, slow: 0.25,
          from: { x: p.x, y: p.y - 10 },
          age: -i * 0.15,
        })
      }
    },
  },

  gust: {
    name: 'Gust',
    type: 'flying',
    description: 'Rajada de vento circular que empurra todos para longe.',
    base: stats({ damage: 8, cooldown: 3, amount: 1, duration: 0.45, knockback: 170 }),
    upgrades: [
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: 'Recarga 0.4s mais rápida', delta: { cooldown: -0.4 } },
      { text: '+1 rajada', delta: { amount: 1 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+30% de área e empurrão', delta: { area: 0.3, knockback: 60 } },
      { text: '+1 rajada', delta: { amount: 1 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (let i = 0; i < s.amount; i++) {
        spawnAttack(g, {
          move: 'gust', type: 'flying', visual: 'gust', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 6 },
          motion: { kind: 'follow', ox: 0, oy: -4 },
          damage: s.damage, knockback: s.knockback, ttl: s.duration, grow: (74 * s.area) / s.duration,
          age: -i * 0.22,
        })
      }
    },
  },
} as const satisfies Record<string, MoveDef>

export type MoveId = keyof typeof MOVES

export const MOVE_IDS = Object.keys(MOVES) as MoveId[]

export const maxMoveLevel = (id: MoveId) => MOVES[id].upgrades.length + 1

/** Final stats of a move at `level`, after upgrades and player modifiers. */
export const moveStats = (id: MoveId, level: number, player: PlayerStats): MoveStats => {
  const def: MoveDef = MOVES[id]
  const s = def.upgrades.slice(0, level - 1).reduce<MoveStats>((acc, { delta }) => {
    const next = { ...acc }
    for (const k of Object.keys(delta) as (keyof MoveStats)[]) next[k] += delta[k] ?? 0
    return next
  }, def.base)
  return {
    ...s,
    damage: s.damage * player.might,
    cooldown: Math.max(0.1, s.cooldown * player.cooldown),
    area: s.area * player.area,
    amount: s.amount + player.amount,
    speed: s.speed * player.projectileSpeed,
    duration: s.duration * player.duration,
  }
}
