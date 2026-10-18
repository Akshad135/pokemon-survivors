import { BRANCHES, type BranchDef, type BranchId } from '../data/branches'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { MoveId } from './moves'

/**
 * Learnsets by evolution stage (`PlayableDef.learnset`): a run learns the
 * lists of the stages it reached, plus a branch's moves once it evolved into
 * it, so a Charmeleon can learn what a Charmander couldn't. The moves an
 * evolution unlocks weigh `FRESH_WEIGHT` times more in the next
 * `FRESH_LEVELUPS` level-ups (`offerPool`), so they show up while it's news.
 */

export const FRESH_LEVELUPS = 3
export const FRESH_WEIGHT = 2

/** The branch the run took, when it belongs to this family. */
const ownBranch = (starter: PlayableId, branch: BranchId | null): BranchDef | null => {
  const b: BranchDef | null = branch ? BRANCHES[branch] : null
  return b && b.line === starter ? b : null
}

/**
 * The moves reaching `stage` unlocks: that stage's list, plus the branch's
 * moves when the branch replaces it, minus anything learnable before. Stage 0
 * is the starting list (signature included).
 */
export const unlockedAt = (starter: PlayableId, branch: BranchId | null, stage: number): readonly MoveId[] => {
  const lists: readonly (readonly MoveId[])[] = PLAYABLE[starter].learnset
  const b = ownBranch(starter, branch)
  const earlier = new Set<MoveId>(lists.slice(0, stage).flat())
  if (b && b.stage < stage) for (const m of b.moves) earlier.add(m)
  const here = [...(lists[stage] ?? []), ...(b && b.stage === stage ? b.moves : [])]
  return [...new Set(here)].filter((m) => !earlier.has(m))
}

/** The moves a run can learn at `stage` (by default, every stage): each list up to it, in order, and the branch's once it took one. */
export const runLearnset = (starter: PlayableId, branch: BranchId | null, stage = Infinity): readonly MoveId[] => {
  const last = Math.min(stage, PLAYABLE[starter].learnset.length - 1)
  const out: MoveId[] = []
  for (let i = 0; i <= last; i++) out.push(...unlockedAt(starter, branch, i))
  return out
}
