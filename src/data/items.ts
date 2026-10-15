import type { StatDelta } from '../game/stats'
import type { PokeType } from './types'

/** Held items are the passive upgrades. Each level applies its delta cumulatively. */
export type ItemDef = {
  /** Official English name; descriptions live in `i18n`. */
  name: string
  levels: readonly StatDelta[]
  /** Type-boosting items only show up for Pokémon that learn moves of this type. */
  boosts?: PokeType
}

const repeat = (delta: StatDelta, times: number) => Array.from({ length: times }, () => delta)

/** Type-boosting held item (Charcoal, Mystic Water…): +10% damage of one type per level. */
const typeItem = <T extends PokeType>(boosts: T, name: string) => ({
  name,
  levels: repeat({ typeDamage: { [boosts]: 0.1 } }, 3),
  boosts,
})

export const ITEMS = {
  muscleBand: { name: 'Muscle Band', levels: repeat({ might: 0.1 }, 5) },
  quickClaw: { name: 'Quick Claw', levels: repeat({ cooldown: -0.08 }, 5) },
  wideLens: { name: 'Wide Lens', levels: repeat({ area: 0.1 }, 5) },
  lightClay: { name: 'Light Clay', levels: repeat({ duration: 0.12 }, 5) },
  loadedDice: { name: 'Loaded Dice', levels: repeat({ amount: 1 }, 2) },
  leftovers: { name: 'Leftovers', levels: repeat({ regen: 0.3 }, 5) },
  choiceScarf: { name: 'Choice Scarf', levels: repeat({ speed: 5.5 }, 5) },
  luckyEgg: { name: 'Lucky Egg', levels: repeat({ growth: 0.1 }, 5) },
  dowsingMachine: { name: 'Dowsing Machine', levels: repeat({ magnet: 12 }, 5) },
  kingsRock: { name: "King's Rock", levels: repeat({ statusChance: 0.06 }, 5) },
  toxicOrb: { name: 'Toxic Orb', levels: repeat({ statusDamage: 0.2 }, 5) },
  assaultVest: { name: 'Assault Vest', levels: repeat({ maxHp: 20, armor: 1 }, 3) },
  /** Fires loadout moves where the special lands (`arrivalCombo` in `special.ts`). */
  metronome: { name: 'Metronome', levels: repeat({ comboMoves: 1 }, 2) },
  /** Kills made by the special cut its cooldown (`rechargeSpecial` in `special.ts`). */
  powerHerb: { name: 'Power Herb', levels: repeat({ specialRecharge: 0.25 }, 3) },
  charcoal: typeItem('fire', 'Charcoal'),
  mysticWater: typeItem('water', 'Mystic Water'),
  miracleSeed: typeItem('grass', 'Miracle Seed'),
  silkScarf: typeItem('normal', 'Silk Scarf'),
  magnet: typeItem('electric', 'Magnet'),
  poisonBarb: typeItem('poison', 'Poison Barb'),
  sharpBeak: typeItem('flying', 'Sharp Beak'),
  neverMeltIce: typeItem('ice', 'Never-Melt Ice'),
  hardStone: typeItem('rock', 'Hard Stone'),
  silverPowder: typeItem('bug', 'Silver Powder'),
  dragonFang: typeItem('dragon', 'Dragon Fang'),
} as const satisfies Record<string, ItemDef>

export type ItemId = keyof typeof ITEMS

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
