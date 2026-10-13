import type { Rng } from '../engine/rng'
import { ITEM_IDS, ITEMS, type ItemId } from '../data/items'
import { STARTERS, type StarterId } from '../data/starters'
import { rankDeltas } from './meta'
import { maxMoveLevel, type MoveId } from './moves'
import { applyDeltas, BASE_STATS } from './stats'
import type { Game, Offer, OwnedItem, OwnedMove } from './types'

export const MAX_MOVES = 6
export const MAX_ITEMS = 6

/** EXP needed to go from `level` to `level + 1`. */
export const xpFor = (level: number) =>
  Math.floor(5 + (level - 1) * 9 + Math.max(0, level - 20) * 6 + Math.max(0, level - 40) * 10)

export const gainXp = (g: Game, amount: number) => {
  const p = g.player
  p.xp += amount * p.stats.growth
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext
    p.level++
    p.xpNext = xpFor(p.level)
    g.pendingLevelUps++
  }
}

type Loadout = { starter: StarterId; moves: readonly OwnedMove[]; items: readonly OwnedItem[] }

export const loadout = (g: Game): Loadout => ({ starter: g.starter, moves: g.player.moves, items: g.player.items })

/** Every upgrade the player could pick right now, with selection weights. */
export const offerPool = ({ starter, moves, items }: Loadout): Array<readonly [Offer, number]> => {
  const ownedMoves = new Map(moves.map((m) => [m.id, m.level]))
  const ownedItems = new Map(items.map((i) => [i.id, i.level]))
  const learnset: readonly MoveId[] = STARTERS[starter].learnset

  const moveOffers = learnset.flatMap((id): Array<readonly [Offer, number]> => {
    const level = ownedMoves.get(id)
    if (level === undefined) return moves.length < MAX_MOVES ? [[{ kind: 'move', id, level: 1 }, 1]] : []
    return level < maxMoveLevel(id) ? [[{ kind: 'move', id, level: level + 1 }, 1.3]] : []
  })

  const itemOffers = ITEM_IDS.flatMap((id: ItemId): Array<readonly [Offer, number]> => {
    const level = ownedItems.get(id)
    if (level === undefined) return items.length < MAX_ITEMS ? [[{ kind: 'item', id, level: 1 }, 0.8]] : []
    return level < ITEMS[id].levels.length ? [[{ kind: 'item', id, level: level + 1 }, 1]] : []
  })

  return [...moveOffers, ...itemOffers]
}

/** Weighted sampling without replacement. Falls back to a healing berry when maxed out. */
export const rollOffers = (loadout: Loadout, rng: Rng, count = 3): Offer[] => {
  const pool = [...offerPool(loadout)]
  const picked: Offer[] = []
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((s, [, w]) => s + w, 0)
    let roll = rng() * total
    const index = Math.max(0, pool.findIndex(([, w]) => (roll -= w) <= 0))
    picked.push(pool[index]![0])
    pool.splice(index, 1)
  }
  return picked.length > 0 ? picked : [{ kind: 'berry' }]
}

/** Rebuilds player stats from starter, Poké Mart ranks, evolution stage and held items. */
export const recomputeStats = (g: Game) => {
  const p = g.player
  const starter = STARTERS[g.starter]
  const before = p.stats.maxHp
  p.stats = applyDeltas(BASE_STATS, [
    starter.stats,
    ...rankDeltas(g.ranks),
    ...starter.line.slice(0, p.stage + 1).map((s) => s.bonus),
    ...p.items.flatMap((i) => ITEMS[i.id].levels.slice(0, i.level)),
  ])
  if (p.stats.maxHp > before) p.hp += p.stats.maxHp - before
  p.hp = Math.min(p.hp, p.stats.maxHp)
}

export const applyOffer = (g: Game, offer: Offer) => {
  const p = g.player
  switch (offer.kind) {
    case 'move': {
      const owned = p.moves.find((m) => m.id === offer.id)
      if (owned) owned.level = offer.level
      else p.moves.push({ id: offer.id, level: 1, cooldown: 0.2 })
      break
    }
    case 'item': {
      const owned = p.items.find((i) => i.id === offer.id)
      if (owned) owned.level = offer.level
      else p.items.push({ id: offer.id, level: 1 })
      recomputeStats(g)
      break
    }
    case 'berry':
      p.hp = Math.min(p.stats.maxHp, p.hp + 40)
      g.events.push({ kind: 'heal' })
      break
  }
}

/** The next evolution, if the player's level has reached it. */
export const pendingEvolution = (g: Game) => {
  const line = STARTERS[g.starter].line
  const stage = line[g.player.stage]
  const next = line[g.player.stage + 1]
  return stage && next && 'evolveAt' in stage && g.player.level >= stage.evolveAt ? { from: stage.dex, to: next.dex } : null
}
