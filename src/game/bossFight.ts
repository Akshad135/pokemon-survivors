import { range, type Rng } from '../engine/rng'
import {
  BOSS_DIFFICULTY, BOSS_PATTERNS, BOSS_PHASES, BOSS_RAGE, MIN_TELEGRAPH, STANCES,
  type BlastSafe, type BossPattern, type BossPhase, type BossStance, type HazardVisual,
} from '../data/bosses'
import type { EnemyId } from '../data/enemies'
import { bossWaveAt } from '../data/waves'
import { DIFFICULTY_IDS, type Difficulty } from './difficulty'
import * as dm from '../engine/dmath'

/**
 * A boss moving on its own script instead of walking (`game/bosses.ts`):
 * a `dash` marks its lane for `wait` s then rushes (vx, vy) for `left` s,
 * `more` times again; a `dive` is under, untouchable, for `left` s, its wake at
 * (x, y) following the player until `lock` s are left (then its strike shows);
 * `away` is a teleport waiting for its landing.
 */
export type BossMotion =
  | { kind: 'dash'; wait: number; left: number; vx: number; vy: number; more: number; speed: number; width: number; damage: number; windup: number; hit: boolean }
  | { kind: 'dive'; left: number; lock: number; x: number; y: number; windup: number; radius: number; damage: number; visual: HazardVisual }
  | { kind: 'away'; left: number }

/**
 * A blast charging (`left` of `total` s) from (x, y): when it lands it hurts
 * the player unless they stand somewhere `safe` (for `spots`, within `radius`
 * of one of its `spots`).
 */
export type BossBlast = { left: number; total: number; x: number; y: number; damage: number; safe: BlastSafe; radius: number; visual: HazardVisual; spots: readonly { x: number; y: number }[] }

/**
 * A boss's fight state: the stance it's in (`BossStance`), seconds until
 * it swaps, whether it has enraged, the share of HP it has left (`share`, kept
 * fresh by `updateBosses`) and the run's difficulty. Bosses with phases
 * (`BOSS_PHASES`) also keep the phase they're in (`phase`, `phaseAge`, the
 * `shift` left on its opening), their ultimate (`ult` while it plays,
 * `ultLeft` until the next), their scripted `motion`, a charging `blast` and
 * `home`, where they appeared. Pure rules; `updateBosses` drives them.
 */
export type BossFight = {
  stance: BossStance
  stanceLeft: number
  enraged: boolean
  share: number
  difficulty: Difficulty
  phase: number
  phaseAge: number
  shift: number
  ult: { t: number; step: number } | null
  ultLeft: number
  motion: BossMotion | null
  blast: BossBlast | null
  home: { x: number; y: number }
}

/** The phases of a boss that fights in phases, or null. */
export const phasesOf = (kind: EnemyId): readonly BossPhase[] | null => BOSS_PHASES[kind] ?? null

/** The phase a boss with `share` of its HP left is in: the last one whose threshold it fell under. */
export const phaseAt = (phases: readonly BossPhase[], share: number) => {
  let at = 0
  for (let i = 1; i < phases.length; i++) if (share < phases[i]!.below) at = i
  return at
}

/** The patterns a boss fights with now: its phase's, or its flat list. */
export const patternsOf = (kind: EnemyId, fight: BossFight | null): readonly BossPattern[] | undefined => {
  const phases = phasesOf(kind)
  return phases ? phases[fight?.phase ?? 0]!.patterns : BOSS_PATTERNS[kind]
}

/** Whether a boss's script holds it still and untouchable for now: a phase's opening, a dive or a teleport. */
export const bossAway = (fight: BossFight | null) => fight !== null && (fight.motion?.kind === 'dive' || fight.motion?.kind === 'away')

/**
 * The seconds an ultimate keeps the rest of the phase's patterns waiting: its
 * last step's time plus that step's warning and a beat to breathe.
 */
export const ultimateLength = (steps: readonly { at: number; pattern: BossPattern }[]) =>
  steps.reduce((end, s) => Math.max(end, s.at + warningOf(s.pattern)), 0) + 0.8

/** How long a pattern warns before it lands (0 for the ones that land at once). */
export const warningOf = (p: BossPattern) => {
  switch (p.kind) {
    case 'strikes': return p.delay
    case 'volley': return p.windup
    case 'beam': return p.windup + p.duration
    case 'dash': return p.windup * p.count + 1
    case 'dive': return p.hide + p.windup
    case 'teleport': case 'blast': return p.windup
    case 'ring': return p.windup ?? 0
    case 'cage': return p.ttl
    default: return 0
  }
}

/**
 * Wave bosses fight in stances and enrage. Rift legendaries and Arceus don't:
 * a rift is already a timed duel and the reaper is meant to be outlasted, not
 * read (their phases carry the fight instead).
 */
export const fightsInStances = (kind: EnemyId) =>
  bossWaveAt(kind) !== null && (BOSS_PATTERNS[kind] ?? BOSS_PHASES[kind]?.flatMap((ph) => ph.patterns) ?? []).some((p) => p.stance !== undefined)

const stanceTime = (rng: Rng) => range(rng, BOSS_RAGE.stance[0], BOSS_RAGE.stance[1])

/** Bosses arrive rushing in (`close`), so the first stance shows up on screen soon. */
export const createFight = (rng: Rng, difficulty: Difficulty, home = { x: 0, y: 0 }): BossFight => ({
  stance: 'close',
  stanceLeft: stanceTime(rng),
  enraged: false,
  share: 1,
  difficulty,
  phase: 0,
  phaseAge: 0,
  shift: 0,
  ult: null,
  ultLeft: Infinity,
  motion: null,
  blast: null,
  home,
})

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

/** Where a boss with phases heads this tick and at what share of its pace (0: it stays put). */
export type Steering = { x: number; y: number; pace: number }

/**
 * Where a boss in a fight with phases walks (`BossSteer`): nowhere during a
 * phase's opening or a scripted motion; otherwise at the player, holding a
 * range, wandering around its anchor, or circling its home. `now` drives the
 * wandering, so it stays deterministic. False when its phase doesn't steer.
 */
export const steerBoss = (fight: BossFight, kind: EnemyId, e: { x: number; y: number; id: number }, p: { x: number; y: number }, now: number, out: Steering) => {
  const steer = phasesOf(kind)?.[fight.phase]?.steer
  if (!steer) return false
  out.x = p.x
  out.y = p.y
  out.pace = fight.shift > 0 || fight.motion !== null ? 0 : (steer.pace ?? 1)
  switch (steer.kind) {
    case 'chase':
      return true
    case 'hold':
      if ((p.x - e.x) * (p.x - e.x) + (p.y - e.y) * (p.y - e.y) < steer.range * steer.range) out.pace = 0
      return true
    case 'anchor': {
      const a = now * 0.5 + e.id
      out.x = fight.home.x + steer.x + dm.cos(a) * steer.drift
      out.y = fight.home.y + steer.y + dm.sin(a * 1.3) * steer.drift * 0.7
      return true
    }
    case 'orbit': {
      const a = dm.atan2(e.y - fight.home.y, e.x - fight.home.x) + 0.6
      out.x = fight.home.x + dm.cos(a) * steer.radius
      out.y = fight.home.y + dm.sin(a) * steer.radius
      return true
    }
  }
}

/**
 * Whether a boss's faint waits: one with phases still to go (or in a phase's
 * opening) stays up at 1 HP and moves on to its next phase instead (`killEnemy`).
 */
export const holdsOn = (e: { kind: EnemyId; fight: BossFight | null }) => {
  const phases = phasesOf(e.kind)
  return phases !== null && e.fight !== null && (e.fight.phase < phases.length - 1 || e.fight.shift > 0)
}
