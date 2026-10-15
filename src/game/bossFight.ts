import { range, type Rng } from '../engine/rng'
import { BOSS_PATTERNS, BOSS_RAGE, STANCES, type BossPattern, type BossStance } from '../data/bosses'
import type { EnemyId } from '../data/enemies'
import { bossWaveAt } from '../data/waves'

/**
 * A wave boss's fight state: the stance it's in (`BossStance`), seconds until
 * it swaps, and whether it has enraged. Pure rules; `updateBosses` drives them.
 */
export type BossFight = { stance: BossStance; stanceLeft: number; enraged: boolean }

/**
 * Wave bosses fight in stances and enrage. Rift legendaries and Arceus keep
 * their flat patterns: a rift is already a timed duel and the reaper is meant
 * to be outlasted, not read.
 */
export const fightsInStances = (kind: EnemyId) => bossWaveAt(kind) !== null && (BOSS_PATTERNS[kind]?.some((p) => p.stance !== undefined) ?? false)

const stanceTime = (rng: Rng) => range(rng, BOSS_RAGE.stance[0], BOSS_RAGE.stance[1])

/** Bosses arrive rushing in (`close`), so the first stance shows up on screen soon. */
export const createFight = (rng: Rng): BossFight => ({ stance: 'close', stanceLeft: stanceTime(rng), enraged: false })

/** Counts the stance down; returns true on the tick it swaps (with a fresh seeded duration). */
export const tickStance = (fight: BossFight, dt: number, rng: Rng) => {
  fight.stanceLeft -= dt
  if (fight.stanceLeft > 0) return false
  fight.stance = fight.stance === 'close' ? 'ranged' : 'close'
  fight.stanceLeft += stanceTime(rng)
  return true
}

/** A pattern fires in `stance` when it has no stance or that one. */
export const patternLive = (p: BossPattern, stance: BossStance) => p.stance === undefined || p.stance === stance

/** True on the tick a boss crosses under `BOSS_RAGE.below` of its HP. */
export const shouldEnrage = (fight: BossFight, hp: number, maxHp: number) => !fight.enraged && hp < maxHp * BOSS_RAGE.below

/** Walking pace multiplier of a boss in a fight. */
export const fightPace = (fight: BossFight) => STANCES[fight.stance].pace * (fight.enraged ? BOSS_RAGE.speed : 1)

/** Seconds until a pattern that just fired fires again. */
export const attackWait = (every: number, fight: BossFight | null) => every * (fight?.enraged ? BOSS_RAGE.wait : 1)

/**
 * Which pattern an enraged boss chains after firing `fired`: the first other
 * live pattern of the stance, else `fired` itself; never a trail (those drip
 * every few ticks). -1 when there's nothing to chain.
 */
export const chainTarget = (patterns: readonly BossPattern[], stance: BossStance, fired: number) => {
  let self = -1
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i]!
    if (p.kind === 'trail' || !patternLive(p, stance)) continue
    if (i !== fired) return i
    self = i
  }
  return self
}
