import { chance, pick, range } from '../engine/rng'
import { BRANCHES, branchesAt, branchesOf } from '../data/branches'
import { EVO_FIND, EVO_ITEM_IDS, type EvoItemId } from '../data/shop'
import { canBranch } from './branch'
import { burst } from './effects'
import { branchNeeds } from './evoItems'
import type { Game } from './types'

/**
 * Evolution items in a run. A branch that needs an item (`branchNeeds`) is
 * only offered when the run holds it: owned (the save's, `ReplayStart.evo`)
 * or found here. While the Pokémon still has such a branch ahead without its
 * item, a boss down may drop one (`EVO_FIND`); a found item lasts the run
 * (`Game.evoFound`). A family with no free branch and no item stays in its
 * form at its evolution, as strong as with an Everstone (`Game.evoHeld`),
 * until an item turns up. All from the simulation and its rng, so a replay
 * finds the same items.
 */

/** The evolution items the run holds: the save's and the ones found in it. */
export const runEvoItems = (g: Game): readonly EvoItemId[] => (g.evoFound.length === 0 ? g.evoItems : [...g.evoItems, ...g.evoFound])

/**
 * The items the run's Pokémon lacks for a branch still ahead of it, in catalog
 * order: none once it has branched, or under an Everstone (it never evolves).
 */
export const missingEvoItems = (g: Game): EvoItemId[] => {
  if (g.everstone || g.branch !== null) return []
  const held = runEvoItems(g)
  const needed = branchesOf(g.starter).flatMap((b) => (BRANCHES[b].stage > g.player.stage ? [branchNeeds(b)] : []))
  return EVO_ITEM_IDS.filter((id) => needed.includes(id) && !held.includes(id))
}

/** A boss down: with `EVO_FIND.chance` it drops one of the missing items (never one already lying on the ground). */
export const dropEvoItem = (g: Game, x: number, y: number) => {
  const missing = missingEvoItems(g).filter((id) => !g.pickups.some((k) => k.kind === 'evoItem' && k.item === id))
  if (missing.length === 0 || !chance(g.rng, EVO_FIND.chance)) return
  g.pickups.push({ id: g.nextId++, x, y, vx: range(g.rng, -20, 20), vy: range(g.rng, -40, -20), attracted: false, age: 0, kind: 'evoItem', item: pick(g.rng, missing) })
}

/** An evolution item picked up: the run holds it to the end. An evolution waiting on it goes on at once (`evolutionFreed`, checked by `step`). */
export const collectEvoItem = (g: Game, item: EvoItemId) => {
  if (!g.evoFound.includes(item)) g.evoFound.push(item)
  const p = g.player
  burst(g, p.x, p.y - 12, { colors: ['#f8f0a8', '#ffffff', '#a8e0f8', '#c890f8'], count: 36, speed: 110, ttl: 0.8, gravity: -30 })
  g.events.push({ kind: 'evoItem', item })
}

/** A held evolution (`Game.evoHeld`) can go on: the run now holds an item for one of its branches. */
export const evolutionFreed = (g: Game) => g.evoHeld && canBranch(branchesAt(g.starter, g.player.stage + 1), runEvoItems(g))
