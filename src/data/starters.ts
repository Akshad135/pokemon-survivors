import type { MoveId } from '../game/moves'
import type { StatDelta } from '../game/stats'
import type { PokeType } from './types'

export type EvolutionStage = {
  dex: number
  name: string
  /** Level at which this stage evolves into the next one. */
  evolveAt?: number
  /** Stat bonus granted when reaching this stage. */
  bonus: StatDelta
}

export type StarterDef = {
  name: string
  types: readonly PokeType[]
  blurb: string
  color: string
  stats: StatDelta
  /** Move the run starts with. */
  signature: MoveId
  /** Moves this Pokémon can learn on level up (signature included). */
  learnset: readonly MoveId[]
  line: readonly [EvolutionStage, EvolutionStage, EvolutionStage]
}

const SHARED_MOVES = ['swift', 'thunder', 'sludgeBomb', 'gust'] as const satisfies readonly MoveId[]

export const STARTERS = {
  charmander: {
    name: 'Charmander',
    types: ['fire'],
    blurb: 'Ofensivo. Mais dano, menos vida.',
    color: '#f08030',
    stats: { might: 0.15, maxHp: -10 },
    signature: 'ember',
    learnset: ['ember', 'fireSpin', ...SHARED_MOVES],
    line: [
      { dex: 4, name: 'Charmander', evolveAt: 12, bonus: {} },
      { dex: 5, name: 'Charmeleon', evolveAt: 28, bonus: { maxHp: 25, might: 0.1, speed: 3 } },
      { dex: 6, name: 'Charizard', bonus: { maxHp: 40, might: 0.2, speed: 6, area: 0.1 } },
    ],
  },
  squirtle: {
    name: 'Squirtle',
    types: ['water'],
    blurb: 'Defensivo. Mais vida e defesa.',
    color: '#6890f0',
    stats: { maxHp: 20, armor: 1, speed: -3 },
    signature: 'waterGun',
    learnset: ['waterGun', 'whirlpool', ...SHARED_MOVES],
    line: [
      { dex: 7, name: 'Squirtle', evolveAt: 12, bonus: {} },
      { dex: 8, name: 'Wartortle', evolveAt: 28, bonus: { maxHp: 35, armor: 1, might: 0.05 } },
      { dex: 9, name: 'Blastoise', bonus: { maxHp: 50, armor: 2, might: 0.15, amount: 1 } },
    ],
  },
  bulbasaur: {
    name: 'Bulbasaur',
    types: ['grass', 'poison'],
    blurb: 'Equilibrado. Regenera vida.',
    color: '#78c850',
    stats: { regen: 0.4, maxHp: 10 },
    signature: 'razorLeaf',
    learnset: ['razorLeaf', 'vineWhip', ...SHARED_MOVES],
    line: [
      { dex: 1, name: 'Bulbasaur', evolveAt: 12, bonus: {} },
      { dex: 2, name: 'Ivysaur', evolveAt: 28, bonus: { maxHp: 30, regen: 0.4, might: 0.08 } },
      { dex: 3, name: 'Venusaur', bonus: { maxHp: 45, regen: 0.6, might: 0.15, area: 0.15 } },
    ],
  },
} as const satisfies Record<string, StarterDef>

export type StarterId = keyof typeof STARTERS

export const STARTER_IDS = Object.keys(STARTERS) as StarterId[]

export const starterDex = (id: StarterId) => STARTERS[id].line.map((s) => s.dex)
