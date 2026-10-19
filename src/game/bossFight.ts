import { range, type Rng } from '../engine/rng'
import { BOSS_DIFFICULTY, BOSS_PATTERNS, BOSS_RAGE, MIN_TELEGRAPH, STANCES, type BossPattern, type BossStance } from '../data/bosses'
import type { EnemyId } from '../data/enemies'
import { bossWaveAt } from '../data/waves'
import { DIFFICULTY_IDS, type Difficulty } from './difficulty'

/**
 * A wave boss's fight state: the stance it's in (`BossStance`), seconds until
 * it swaps, whether it has enraged, the share of HP it has left (`share`, kept
 * fresh by `updateBosses`) and the run's difficulty. Pure rules; `updateBosses`
 * drives them.
 */
export type BossFight = { stance: BossStance; stanceLeft: number; enraged: boolean; share: number; difficulty: Difficulty }

/**
 * Wave bosses fight in stances and enrage. Rift legendaries and Arceus keep
 * their flat patterns: a rift is already a timed duel and the reaper is meant
 * to be outlasted, not read.
 */
export const fightsInStances = (kind: EnemyId) => bossWaveAt(kind) !== null && (BOSS_PATTERNS[kind]?.some((p) => p.stance !== undefined) ?? false)

const stanceTime = (rng: Rng) => range(rng, BOSS_RAGE.stance[0], BOSS_RAGE.stance[1])

/** Bosses arrive rushing in (`close`), so the first stance shows up on screen soon. */
export const createFight = (rng: Rng, difficulty: Difficulty): BossFight => ({ stance: 'close', stanceLeft: stanceTime(rng), enraged: false, share: 1, difficulty })

/** Counts the stance down; returns true on the tick it swaps (with a fresh seeded duration). */
export const tickStance = (fight: BossFight, dt: number, rng: Rng) => {
  fight.stanceLeft -= dt
  if (fight.stanceLeft > 0) return false
  fight.stance = fight.stance === 'close' ? 'ranged' : 'close'
  fight.stanceLeft += stanceTime(rng)
  return true
}

/** Whether a pattern fires in this fight now: its stance, HP and difficulty gates (`PatternGate`; `far` is checked as it fires). */
export const patternLive = (p: BossPattern, fight: BossFight) =>
  (p.stance === undefined || p.stance === fight.stance) &&
  (p.below === undefined || fight.share < p.below) &&
  (p.from === undefined || DIFFICULTY_IDS.indexOf(fight.difficulty) >= DIFFICULTY_IDS.indexOf(p.from))

/** True on the tick a boss crosses under `BOSS_RAGE.below` of its HP. */
export const shouldEnrage = (fight: BossFight, hp: number, maxHp: number) => !fight.enraged && hp < maxHp * BOSS_RAGE.below

/** Walking pace multiplier of a boss in a fight. */
export const fightPace = (fight: BossFight) => STANCES[fight.stance].pace * (fight.enraged ? BOSS_RAGE.speed : 1)

/** Seconds until a pattern that just fired fires again: the difficulty's pace and the enrage press it (a trail keeps its drip). */
export const attackWait = (p: BossPattern, fight: BossFight | null) => {
  if (!fight || p.kind === 'trail') return p.every
  return p.every * BOSS_DIFFICULTY[fight.difficulty].pace * (fight.enraged ? BOSS_RAGE.wait : 1)
}

/** How many projectiles or circles a pattern fires in this fight: a single one stays single, several grow with the difficulty. */
export const attackCount = (count: number, fight: BossFight | null) => (fight && count > 1 ? Math.round(count * BOSS_DIFFICULTY[fight.difficulty].more) : count)

/** A warning's length in this fight: shortened by the difficulty, never under `MIN_TELEGRAPH` (nor lengthened when written shorter). */
export const telegraph = (seconds: number, fight: BossFight | null) =>
  fight ? Math.max(Math.min(seconds, MIN_TELEGRAPH), seconds * BOSS_DIFFICULTY[fight.difficulty].telegraph) : seconds

/** How many seconds of the player's path a `lead` pattern reaches ahead: `lead` of its warning, times the difficulty's `aim`. */
export const leadTime = (lead: number, delay: number, fight: BossFight | null) => lead * delay * (fight ? BOSS_DIFFICULTY[fight.difficulty].aim : 1)

/** The chance an enraged boss chains a second attack, by difficulty. */
export const chainChance = (fight: BossFight) => BOSS_DIFFICULTY[fight.difficulty].chain

/**
 * Which pattern an enraged boss chains after firing `fired`: the first other
 * live pattern, else `fired` itself; never a trail (those drip every few
 * ticks). -1 when there's nothing to chain.
 */
export const chainTarget = (patterns: readonly BossPattern[], fight: BossFight, fired: number) => {
  let self = -1
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i]!
    if (p.kind === 'trail' || !patternLive(p, fight)) continue
    if (i !== fired) return i
    self = i
  }
  return self
}
