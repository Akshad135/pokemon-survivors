import { pick, type Rng } from '../engine/rng'
import type { BiomeId, WeatherId } from '../data/biomes'
import { BRANCH_OFFERS, BRANCHES, branchStage, type BranchDef, type BranchId } from '../data/branches'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { EvolutionStage } from '../data/starters'
import type { Game } from './types'
import { legendStage } from './legend'
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

/** The form the player is in right now (before a Mega form): a legend's awakened form and Multitype's typing included (`legendStage`). */
export const playerForm = (g: Game): EvolutionStage => (g.legend ? legendStage(g, g.legend) : formAt(g.starter, g.branch, g.player.stage))

/** What nudges the draw: the weather where the player stands and the biome. */
export type BranchContext = { weather: WeatherId; biome: BiomeId }

export const branchContext = (g: Game): BranchContext => ({ weather: weatherHere(g), biome: g.biome.id })

/** Why a branch was nudged forward: the weather, the biome, or an evolution item the save owns guarantees it (null: it wasn't). */
export type BranchFavor = 'weather' | 'biome' | 'item' | null

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
 * in a random slot. `sure` (the branches the save's evolution items guarantee,
 * `guaranteedBranches`) are always among them, marked `item`: they take their
 * slots first (drawn among them if there are more than `count`), the draw
 * fills the rest. Without any, the draw is exactly as before.
 */
export const drawBranches = (rng: Rng, options: readonly BranchId[], ctx: BranchContext, count = BRANCH_OFFERS, sure: readonly BranchId[] = []): BranchOffer[] => {
  const item = (id: BranchId): BranchOffer => ({ id, favor: 'item' })
  if (options.length <= count) return options.map((id) => (sure.includes(id) ? item(id) : { id, favor: favorOf(id, ctx) }))
  if (sure.length > 0) return drawAround(rng, options, ctx, count, sure).map((id) => (sure.includes(id) ? item(id) : { id, favor: favorOf(id, ctx) }))
  const fitting = options.filter((id) => favorOf(id, ctx) !== null)
  const lead = pick(rng, fitting.length > 0 ? fitting : options)
  const rest = options.filter((id) => id !== lead)
  const others: BranchId[] = []
  while (others.length < count - 1) others.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]!)
  const offers: BranchOffer[] = others.map((id) => ({ id, favor: null }))
  offers.splice(Math.floor(rng() * count), 0, { id: lead, favor: favorOf(lead, ctx) })
  return offers
}

/** `drawBranches` with guaranteed branches: they take their slots first, the favored draw fills the rest, then the slots are shuffled. */
const drawAround = (rng: Rng, options: readonly BranchId[], ctx: BranchContext, count: number, sure: readonly BranchId[]): BranchId[] => {
  const kept = [...sure]
  while (kept.length > count) kept.splice(Math.floor(rng() * kept.length), 1)
  const rest = options.filter((id) => !kept.includes(id))
  const fitting = rest.filter((id) => favorOf(id, ctx) !== null)
  const picked = [...kept]
  if (picked.length < count) picked.push(pick(rng, fitting.length > 0 ? fitting : rest))
  const left = rest.filter((id) => !picked.includes(id))
  while (picked.length < count) picked.push(left.splice(Math.floor(rng() * left.length), 1)[0]!)
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j]!, picked[i]!]
  }
  return picked
}
