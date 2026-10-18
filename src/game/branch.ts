import { pick, type Rng } from '../engine/rng'
import type { BiomeId, WeatherId } from '../data/biomes'
import { BRANCH_OFFERS, BRANCHES, branchStage, type BranchDef, type BranchId } from '../data/branches'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { EvolutionStage } from '../data/starters'
import type { MoveId } from './moves'
import type { Game } from './types'
import { weatherHere } from './weather'

/**
 * Branching evolutions in a run (`data/branches.ts`). The branch picked lives
 * in `Game.branch` and replaces its stage of the line from then on, so
 * everything that asks "which form is the player" goes through `formAt` /
 * `playerForm`. The draw is pure and takes the run's rng, so a replay draws the
 * same three.
 */

/** The stage of a line at `stage`, or the branch picked when it replaces that stage. */
export const formAt = (starter: PlayableId, branch: BranchId | null, stage: number): EvolutionStage => {
  const line: readonly EvolutionStage[] = PLAYABLE[starter].line
  const at = Math.min(stage, line.length - 1)
  const b = branch ? BRANCHES[branch] : null
  if (!b || b.line !== starter || at < b.stage) return line[at]!
  // The branch keeps the line's evolution level, for a branch that evolves on (none yet).
  const own = line[at]!
  return own.evolveAt === undefined ? branchStage(branch!) : { ...branchStage(branch!), evolveAt: own.evolveAt }
}

/** The whole line as the run plays it, with the branch in place. */
export const formLine = (starter: PlayableId, branch: BranchId | null): readonly EvolutionStage[] =>
  PLAYABLE[starter].line.map((_, i) => formAt(starter, branch, i))

/** The form the player is in right now (before a Mega form). */
export const playerForm = (g: Game) => formAt(g.starter, g.branch, g.player.stage)

/** What nudges the draw: the weather where the player stands and the biome. */
export type BranchContext = { weather: WeatherId; biome: BiomeId }

export const branchContext = (g: Game): BranchContext => ({ weather: weatherHere(g), biome: g.biome.id })

/** Why a branch was nudged forward: the weather or the biome (null: it wasn't). */
export type BranchFavor = 'weather' | 'biome' | null

/** How the run's context favors a branch: the weather first, then the biome. */
export const favorOf = (id: BranchId, ctx: BranchContext): BranchFavor => {
  const def: BranchDef = BRANCHES[id]
  const f = def.favors ?? {}
  if (f.weather?.includes(ctx.weather)) return 'weather'
  if (f.biome?.includes(ctx.biome)) return 'biome'
  return null
}

export type BranchOffer = { id: BranchId; favor: BranchFavor }

/**
 * The branches an evolution offers. Up to `count` options are all offered, in
 * data order. Otherwise one comes from those the context favors (any, when
 * none fits) and the rest are drawn from the others, and the favored one lands
 * in a random slot.
 */
export const drawBranches = (rng: Rng, options: readonly BranchId[], ctx: BranchContext, count = BRANCH_OFFERS): BranchOffer[] => {
  if (options.length <= count) return options.map((id) => ({ id, favor: favorOf(id, ctx) }))
  const fitting = options.filter((id) => favorOf(id, ctx) !== null)
  const lead = pick(rng, fitting.length > 0 ? fitting : options)
  const rest = options.filter((id) => id !== lead)
  const others: BranchId[] = []
  while (others.length < count - 1) others.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]!)
  const offers: BranchOffer[] = others.map((id) => ({ id, favor: null }))
  offers.splice(Math.floor(rng() * count), 0, { id: lead, favor: favorOf(lead, ctx) })
  return offers
}

/** The moves a run can learn: the family's, plus the branch's once it took one. */
export const runLearnset = (starter: PlayableId, branch: BranchId | null): readonly MoveId[] => {
  const own: readonly MoveId[] = PLAYABLE[starter].learnset
  const b = branch ? BRANCHES[branch] : null
  return b && b.line === starter ? [...own, ...b.moves.filter((m) => !own.includes(m))] : own
}
