import { maxMoveLevel, type MoveId } from '../game/moves'
import type { OwnedItem, OwnedMove } from '../game/types'
import type { ItemId } from './items'

/**
 * Move evolutions, Vampire Survivors style: a move at max level plus its paired
 * held item evolves into a stronger move that takes over the same slot.
 */
export type MoveEvolution = { from: MoveId; item: ItemId; to: MoveId }

export const EVOLUTIONS = [
  { from: 'ember', item: 'charcoal', to: 'flamethrower' },
  { from: 'fireSpin', item: 'charcoal', to: 'fireBlast' },
  { from: 'waterGun', item: 'mysticWater', to: 'hydroPump' },
  { from: 'whirlpool', item: 'mysticWater', to: 'surf' },
  { from: 'razorLeaf', item: 'miracleSeed', to: 'leafStorm' },
  { from: 'vineWhip', item: 'miracleSeed', to: 'powerWhip' },
  { from: 'swift', item: 'silkScarf', to: 'triAttack' },
  { from: 'thunder', item: 'magnet', to: 'wildboltStorm' },
  { from: 'sludgeBomb', item: 'poisonBarb', to: 'gunkShot' },
  { from: 'gust', item: 'sharpBeak', to: 'hurricane' },
  { from: 'quickAttack', item: 'silkScarf', to: 'extremeSpeed' },
  { from: 'shockWave', item: 'magnet', to: 'thunderbolt' },
  { from: 'toxicSpikes', item: 'poisonBarb', to: 'barbBarrage' },
  { from: 'willOWisp', item: 'charcoal', to: 'inferno' },
  { from: 'iceShard', item: 'neverMeltIce', to: 'blizzard' },
  { from: 'rockTomb', item: 'hardStone', to: 'stoneEdge' },
  { from: 'pinMissile', item: 'silverPowder', to: 'megahorn' },
  { from: 'dragonBreath', item: 'dragonFang', to: 'outrage' },
] as const satisfies readonly MoveEvolution[]

/** The evolution a base move can go through, if any. */
export const evolutionOf = (move: MoveId): MoveEvolution | undefined => EVOLUTIONS.find((e) => e.from === move)

/** The evolution that produced `move`, if it is an evolved move. */
export const evolvedFrom = (move: MoveId): MoveEvolution | undefined => EVOLUTIONS.find((e) => e.to === move)

type Owned = { moves: readonly OwnedMove[]; items: readonly OwnedItem[] }

/** True when the base move is at max level and its paired item is held. */
export const canEvolve = (evo: MoveEvolution, { moves, items }: Owned) =>
  moves.some((m) => m.id === evo.from && m.level >= maxMoveLevel(evo.from)) && items.some((i) => i.id === evo.item)

/** Evolutions the player can take right now. */
export const readyEvolutions = (owned: Owned): MoveEvolution[] => EVOLUTIONS.filter((e) => canEvolve(e, owned))
