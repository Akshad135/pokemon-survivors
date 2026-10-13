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

/** `count` angles evenly around the full circle, slowly rotating with game time. */
const radial = (g: Game, count: number, spin = 1.7) =>
  Array.from({ length: count }, (_, i) => g.time * spin + (i / count) * TAU)

/** Offset `dist` px towards `angle`, at body height, for strikes glued to the player. */
const reachOffset = (angle: number, dist: number) => {
  const d = fromAngle(angle, dist)
  return { ox: d.x, oy: d.y - 8 }
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

  machPunch: {
    name: 'Mach Punch',
    type: 'fighting',
    description: 'Combo de socos rápidos no inimigo mais próximo.',
    base: stats({ damage: 9, cooldown: 1.1, amount: 3, knockback: 50 }),
    upgrades: [
      { text: '+1 soco', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 soco', delta: { amount: 1 } },
      { text: 'Recarga 0.2s mais rápida', delta: { cooldown: -0.2 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+2 socos', delta: { amount: 2 } },
    ],
    fire: (g, s) => {
      const angle = aimAngle(g, 90)
      for (let i = 0; i < s.amount; i++) {
        const jab = angle + (i % 2 === 0 ? 0.3 : -0.3)
        spawnAttack(g, {
          move: 'machPunch', type: 'fighting', visual: 'fist', x: g.player.x, y: g.player.y,
          shape: { kind: 'circle', r: 9 * s.area },
          motion: { kind: 'follow', ...reachOffset(jab, 20 * s.area) },
          damage: s.damage, knockback: s.knockback, ttl: 0.14, age: -i * 0.09,
        })
      }
    },
  },

  flashCannon: {
    name: 'Flash Cannon',
    type: 'steel',
    description: 'Esfera de aço que atravessa tudo em linha reta.',
    base: stats({ damage: 16, cooldown: 2.2, amount: 1, speed: 150, knockback: 80 }),
    upgrades: [
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+25% de área', delta: { area: 0.25 } },
      { text: 'Recarga 0.3s mais rápida', delta: { cooldown: -0.3 } },
      { text: '+1 esfera', delta: { amount: 1 } },
      { text: '+8 de dano', delta: { damage: 8 } },
      { text: '+25% de área', delta: { area: 0.25 } },
      { text: '+1 esfera', delta: { amount: 1 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of fan(aimAngle(g, 300), s.amount, 0.3)) {
        const v = fromAngle(angle, s.speed)
        spawnAttack(g, {
          move: 'flashCannon', type: 'steel', visual: 'steel', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 8 * s.area },
          motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: s.damage, knockback: s.knockback, ttl: 2.2,
        })
      }
    },
  },

  spiritShackle: {
    name: 'Spirit Shackle',
    type: 'ghost',
    description: 'Rajada de flechas espectrais em leque que atravessam inimigos.',
    base: stats({ damage: 8, cooldown: 1.4, amount: 3, speed: 260, pierce: 2, knockback: 20 }),
    upgrades: [
      { text: '+1 flecha', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Atravessa +1 inimigo', delta: { pierce: 1 } },
      { text: '+1 flecha', delta: { amount: 1 } },
      { text: 'Recarga 0.2s mais rápida', delta: { cooldown: -0.2 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+2 flechas', delta: { amount: 2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of fan(aimAngle(g, 300), s.amount, 0.14)) {
        const v = fromAngle(angle, s.speed)
        spawnAttack(g, {
          move: 'spiritShackle', type: 'ghost', visual: 'arrow', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 4 * s.area },
          motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 1.2,
        })
      }
    },
  },

  waterShuriken: {
    name: 'Water Shuriken',
    type: 'water',
    description: 'Shurikens d’água teleguiadas, rápidas e certeiras.',
    base: stats({ damage: 5, cooldown: 0.9, amount: 2, speed: 230, pierce: 1, knockback: 15 }),
    upgrades: [
      { text: '+1 shuriken', delta: { amount: 1 } },
      { text: '+2 de dano', delta: { damage: 2 } },
      { text: 'Recarga 0.12s mais rápida', delta: { cooldown: -0.12 } },
      { text: '+1 shuriken', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Shurikens mais rápidas', delta: { speed: 60 } },
      { text: '+2 shurikens', delta: { amount: 2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const taken = new Set<number>()
      fan(aimAngle(g, 300), s.amount, 0.5).forEach((angle, i) => {
        const target = nearestEnemy(g, p.x, p.y, 300, taken)
        if (target) taken.add(target.id)
        const v = fromAngle(angle, s.speed)
        spawnAttack(g, {
          move: 'waterShuriken', type: 'water', visual: 'shuriken', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 4 * s.area },
          motion: { kind: 'homing', vx: v.x, vy: v.y, speed: s.speed, turn: 10, target },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 1.6, age: -i * 0.05,
        })
      })
    },
  },

  crunch: {
    name: 'Crunch',
    type: 'dark',
    description: 'Mordida poderosa nos inimigos mais próximos.',
    base: stats({ damage: 18, cooldown: 1.6, amount: 1, knockback: 30 }),
    upgrades: [
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+1 mordida', delta: { amount: 1 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: 'Recarga 0.2s mais rápida', delta: { cooldown: -0.2 } },
      { text: '+1 mordida', delta: { amount: 1 } },
      { text: '+8 de dano', delta: { damage: 8 } },
      { text: '+1 mordida e +20% de área', delta: { amount: 1, area: 0.2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const taken = new Set<number>()
      for (let i = 0; i < s.amount; i++) {
        const t = nearestEnemy(g, p.x, p.y, 110, taken)
        if (!t) return
        taken.add(t.id)
        spawnAttack(g, {
          move: 'crunch', type: 'dark', visual: 'jaws', x: t.x, y: t.y - t.radius,
          shape: { kind: 'circle', r: 12 * s.area },
          motion: { kind: 'static' },
          damage: s.damage, knockback: s.knockback, ttl: 0.34, activeFrom: 0.14, activeUntil: 0.2,
          age: -i * 0.07,
        })
      }
    },
  },

  pyroBall: {
    name: 'Pyro Ball',
    type: 'fire',
    description: 'Chuta uma bola de fogo que explode ao cair.',
    base: stats({ damage: 20, cooldown: 2.4, amount: 1, knockback: 90 }),
    upgrades: [
      { text: '+1 bola', delta: { amount: 1 } },
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+25% de área', delta: { area: 0.25 } },
      { text: 'Recarga 0.3s mais rápida', delta: { cooldown: -0.3 } },
      { text: '+8 de dano', delta: { damage: 8 } },
      { text: '+1 bola', delta: { amount: 1 } },
      { text: '+25% de área e +6 de dano', delta: { area: 0.25, damage: 6 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const nearby = enemiesInView(g).filter((e) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 170 ** 2)
      for (let i = 0; i < s.amount; i++) {
        const t = nearby.length > 0 ? pick(g.rng, nearby) : { x: p.x + p.facing.x * 90, y: p.y + p.facing.y * 90 }
        spawnAttack(g, {
          move: 'pyroBall', type: 'fire', visual: 'pyro', x: t.x, y: t.y,
          shape: { kind: 'circle', r: 20 * s.area },
          motion: { kind: 'static' },
          damage: s.damage, knockback: s.knockback, ttl: 0.75, activeFrom: 0.45, activeUntil: 0.55,
          from: { x: p.x, y: p.y - 6 },
          age: -i * 0.12,
        })
      }
    },
  },

  psyshock: {
    name: 'Psyshock',
    type: 'psychic',
    description: 'Orbes psíquicos saem em todas as direções e voltam.',
    base: stats({ damage: 9, cooldown: 2.2, amount: 4, speed: 170, duration: 1, knockback: 30 }),
    upgrades: [
      { text: '+1 orbe', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 orbe', delta: { amount: 1 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: 'Orbes mais rápidos', delta: { speed: 40 } },
      { text: '+2 orbes', delta: { amount: 2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of radial(g, s.amount)) {
        const d = fromAngle(angle)
        spawnAttack(g, {
          move: 'psyshock', type: 'psychic', visual: 'psy', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 6 * s.area },
          motion: { kind: 'boomerang', vx: d.x * s.speed, vy: d.y * s.speed, ax: -d.x * s.speed * 1.6, ay: -d.y * s.speed * 1.6 },
          damage: s.damage, knockback: s.knockback, hitInterval: 0.5, ttl: 1.8 * s.duration,
        })
      }
    },
  },

  earthquake: {
    name: 'Earthquake',
    type: 'ground',
    description: 'Tremor que machuca tudo ao redor. Recarga longa.',
    base: stats({ damage: 24, cooldown: 3.2, amount: 1, duration: 0.35, knockback: 60 }),
    upgrades: [
      { text: '+8 de dano', delta: { damage: 8 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: 'Recarga 0.4s mais rápida', delta: { cooldown: -0.4 } },
      { text: '+1 tremor', delta: { amount: 1 } },
      { text: '+10 de dano', delta: { damage: 10 } },
      { text: '+25% de área', delta: { area: 0.25 } },
      { text: '+1 tremor e +10 de dano', delta: { amount: 1, damage: 10 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (let i = 0; i < s.amount; i++) {
        spawnAttack(g, {
          move: 'earthquake', type: 'ground', visual: 'quake', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 8 },
          motion: { kind: 'static' },
          damage: s.damage, knockback: s.knockback, ttl: s.duration, grow: (84 * s.area) / s.duration,
          age: -i * 0.35,
        })
      }
      g.shake = Math.max(g.shake, 3)
    },
  },

  drumBeating: {
    name: 'Drum Beating',
    type: 'grass',
    description: 'Batidas de tambor: ondas de raízes que desaceleram inimigos.',
    base: stats({ damage: 11, cooldown: 1.9, amount: 1, duration: 0.3, knockback: 40 }),
    upgrades: [
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 batida', delta: { amount: 1 } },
      { text: 'Recarga 0.25s mais rápida', delta: { cooldown: -0.25 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+1 batida', delta: { amount: 1 } },
      { text: '+25% de área e +5 de dano', delta: { area: 0.25, damage: 5 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (let i = 0; i < s.amount; i++) {
        spawnAttack(g, {
          move: 'drumBeating', type: 'grass', visual: 'roots', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 6 },
          motion: { kind: 'follow', ox: 0, oy: 0 },
          damage: s.damage, knockback: s.knockback, ttl: s.duration, grow: (62 * s.area) / s.duration, slow: 0.35,
          age: -i * 0.25,
        })
      }
    },
  },

  disarmingVoice: {
    name: 'Disarming Voice',
    type: 'fairy',
    description: 'Ondas de corações em todas as direções.',
    base: stats({ damage: 7, cooldown: 1.6, amount: 6, speed: 150, pierce: 1, knockback: 30 }),
    upgrades: [
      { text: '+2 corações', delta: { amount: 2 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Atravessa +1 inimigo', delta: { pierce: 1 } },
      { text: 'Recarga 0.2s mais rápida', delta: { cooldown: -0.2 } },
      { text: '+2 corações', delta: { amount: 2 } },
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+4 corações', delta: { amount: 4 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of radial(g, s.amount)) {
        const v = fromAngle(angle, s.speed)
        spawnAttack(g, {
          move: 'disarmingVoice', type: 'fairy', visual: 'heart', x: p.x, y: p.y - 8,
          shape: { kind: 'circle', r: 5 * s.area },
          motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 1.1,
        })
      }
    },
  },

  torchSong: {
    name: 'Torch Song',
    type: 'fire',
    description: 'Canto flamejante: notas de fogo em todas as direções.',
    base: stats({ damage: 9, cooldown: 2, amount: 5, speed: 115, pierce: 2, knockback: 20 }),
    upgrades: [
      { text: '+1 nota', delta: { amount: 1 } },
      { text: '+3 de dano', delta: { damage: 3 } },
      { text: 'Atravessa +1 inimigo', delta: { pierce: 1 } },
      { text: '+2 notas', delta: { amount: 2 } },
      { text: 'Recarga 0.3s mais rápida', delta: { cooldown: -0.3 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+2 notas e +20% de área', delta: { amount: 2, area: 0.2 } },
    ],
    fire: (g, s) => {
      const p = g.player
      for (const angle of radial(g, s.amount, -1.1)) {
        const v = fromAngle(angle, s.speed)
        spawnAttack(g, {
          move: 'torchSong', type: 'fire', visual: 'note', x: p.x, y: p.y - 10,
          shape: { kind: 'circle', r: 5 * s.area },
          motion: { kind: 'linear', vx: v.x, vy: v.y },
          damage: s.damage, knockback: s.knockback, pierce: s.pierce, ttl: 1.4,
        })
      }
    },
  },

  leafBlade: {
    name: 'Leaf Blade',
    type: 'grass',
    description: 'Lâmina giratória que corta tudo ao seu redor.',
    base: stats({ damage: 13, cooldown: 1.5, amount: 1, speed: 12, knockback: 50 }),
    upgrades: [
      { text: '+4 de dano', delta: { damage: 4 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 lâmina', delta: { amount: 1 } },
      { text: 'Recarga 0.2s mais rápida', delta: { cooldown: -0.2 } },
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 lâmina', delta: { amount: 1 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const start = Math.atan2(p.facing.y, p.facing.x)
      for (let i = 0; i < s.amount; i++) {
        spawnAttack(g, {
          move: 'leafBlade', type: 'grass', visual: 'blade', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 9 * s.area },
          motion: { kind: 'orbit', angle: start + (i / s.amount) * TAU, spin: s.speed, radius: 24 * s.area },
          damage: s.damage, knockback: s.knockback, ttl: TAU / s.speed,
        })
      }
    },
  },

  razorShell: {
    name: 'Razor Shell',
    type: 'water',
    description: 'Golpe de concha afiada em arco à sua frente.',
    base: stats({ damage: 15, cooldown: 1.2, amount: 1, knockback: 80 }),
    upgrades: [
      { text: 'Também ataca atrás', delta: { amount: 1 } },
      { text: '+5 de dano', delta: { damage: 5 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: 'Recarga 0.15s mais rápida', delta: { cooldown: -0.15 } },
      { text: '+6 de dano', delta: { damage: 6 } },
      { text: '+20% de área', delta: { area: 0.2 } },
      { text: '+1 golpe e +6 de dano', delta: { amount: 1, damage: 6 } },
    ],
    fire: (g, s) => {
      const p = g.player
      const start = Math.atan2(p.facing.y, p.facing.x)
      for (let i = 0; i < s.amount; i++) {
        spawnAttack(g, {
          move: 'razorShell', type: 'water', visual: 'shell', x: p.x, y: p.y,
          shape: { kind: 'circle', r: 20 * s.area },
          motion: { kind: 'follow', ...reachOffset(start + (i / s.amount) * TAU, 18 * s.area) },
          damage: s.damage, knockback: s.knockback, ttl: 0.22, age: -i * 0.08,
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
