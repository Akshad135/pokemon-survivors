import type { StatDelta } from '../game/stats'

/** Held items are the passive upgrades. Each level applies its delta cumulatively. */
export type ItemDef = {
  name: string
  description: string
  levels: readonly StatDelta[]
}

const repeat = (delta: StatDelta, times: number) => Array.from({ length: times }, () => delta)

export const ITEMS = {
  muscleBand: {
    name: 'Muscle Band',
    description: '+10% de dano em todos os golpes.',
    levels: repeat({ might: 0.1 }, 5),
  },
  quickClaw: {
    name: 'Quick Claw',
    description: 'Golpes recarregam 8% mais rápido.',
    levels: repeat({ cooldown: -0.08 }, 5),
  },
  wideLens: {
    name: 'Wide Lens',
    description: '+10% de área dos golpes.',
    levels: repeat({ area: 0.1 }, 5),
  },
  lightClay: {
    name: 'Light Clay',
    description: 'Efeitos duram 12% a mais.',
    levels: repeat({ duration: 0.12 }, 5),
  },
  loadedDice: {
    name: 'Loaded Dice',
    description: '+1 projétil em golpes com múltiplos acertos.',
    levels: repeat({ amount: 1 }, 2),
  },
  leftovers: {
    name: 'Leftovers',
    description: 'Recupera 0.3 HP por segundo.',
    levels: repeat({ regen: 0.3 }, 5),
  },
  choiceScarf: {
    name: 'Choice Scarf',
    description: '+8% de velocidade de movimento.',
    levels: repeat({ speed: 5.5 }, 5),
  },
  luckyEgg: {
    name: 'Lucky Egg',
    description: '+10% de EXP recebida.',
    levels: repeat({ growth: 0.1 }, 5),
  },
  magnet: {
    name: 'Magnet',
    description: 'Atrai Exp. Candies de mais longe.',
    levels: repeat({ magnet: 12 }, 5),
  },
  kingsRock: {
    name: "King's Rock",
    description: '+6% de chance de causar status (queimar, envenenar, paralisar).',
    levels: repeat({ statusChance: 0.06 }, 5),
  },
  toxicOrb: {
    name: 'Toxic Orb',
    description: 'Queimadura e veneno causam +20% de dano.',
    levels: repeat({ statusDamage: 0.2 }, 5),
  },
  assaultVest: {
    name: 'Assault Vest',
    description: '+20 HP máximo e +1 de defesa.',
    levels: repeat({ maxHp: 20, armor: 1 }, 3),
  },
} as const satisfies Record<string, ItemDef>

export type ItemId = keyof typeof ITEMS

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
