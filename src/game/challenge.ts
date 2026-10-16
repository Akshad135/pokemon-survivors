import { createRng, seedFrom, weightedPick } from '../engine/rng'
import type { EnemyId } from '../data/enemies'
import { PLAYABLE_IDS, type PlayableId } from '../data/hatchlings'
import { brasiliaDay, dayNumber, msSinceDayStart, previousDay, type DayKey } from './day'
import type { Difficulty } from './difficulty'
import { NO_RANKS, UPGRADE_IDS } from './meta'
import { outbreakOf } from './outbreak'
import type { ReplayStart } from './replay'

/**
 * Desafio do dia (daily challenge): one run per Brasília day that is the same
 * for everyone, drawn from the date alone: the seed (so the same map, cast
 * and drops), the Pokémon (any playable one, an egg family still unhatched
 * included: a taste of it) and the difficulty. The Poké Mart's upgrades, the
 * Bag's Lure and Incense, the Shiny Charm and the first run's lucky egg are
 * off, so the board is clean; the day's outbreak stays on (it's the day's
 * too). Only the first finished run of each player counts on the challenge
 * board (the API decides, `server/src/ranking.ts`); the rest are practice.
 * The shell plays it like any run, so replays and their check are the same.
 * Pure; shared with the API.
 */

export const CHALLENGE = {
  /** How often each difficulty comes up: mostly Normal and Hard, a Nightmare now and then. */
  difficulty: [['normal', 5], ['hard', 4], ['nightmare', 2]] as const satisfies ReadonlyArray<readonly [Difficulty, number]>,
  /** A challenge run may still start this long after its day ended (the menus were open at midnight). */
  graceMs: 10 * 60_000,
  /** The ribbons of a day go out this long after it ended: runs that started late have finished, and their checks too. */
  settleMs: 3 * 3_600_000,
} as const

export type Challenge = { day: DayKey; seed: number; starter: PlayableId; difficulty: Difficulty; outbreak: EnemyId }

/** A seeded shuffle of every playable Pokémon: one cycle of days gives each one its day. */
const cycleOrder = (cycle: number) => {
  const rng = createRng(seedFrom(`challenge:${cycle}`))
  const order = [...PLAYABLE_IDS]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

/** The challenge of a Brasília day. The Pokémon walk through seeded cycles, so none repeats within one. */
export const dailyChallenge = (day: DayKey): Challenge => {
  const n = dayNumber(day)
  const size = PLAYABLE_IDS.length
  const rng = createRng(seedFrom(`challenge-day:${day}`))
  return {
    day,
    seed: seedFrom(`challenge-seed:${day}`),
    starter: cycleOrder(Math.floor(n / size))[((n % size) + size) % size]!,
    difficulty: weightedPick(rng, CHALLENGE.difficulty),
    outbreak: outbreakOf(day),
  }
}

/** The run a challenge starts: its seed, Pokémon and difficulty, with every upgrade and item off. `shiny` only changes the colors. */
export const challengeStart = (c: Challenge, view: { w: number; h: number }, shiny: boolean): ReplayStart => ({
  seed: c.seed,
  starter: c.starter,
  difficulty: c.difficulty,
  ranks: NO_RANKS,
  shiny,
  luckyEgg: false,
  outbreak: c.outbreak,
  lure: false,
  incense: false,
  view: { w: view.w, h: view.h },
})

export type ChallengeProblem = 'seed' | 'starter' | 'difficulty' | 'ranks' | 'items' | 'outbreak'

/**
 * Why a run's start isn't `day`'s challenge, or null when it is: the same
 * seed, Pokémon, difficulty and outbreak, no upgrade, no Lure, Incense or
 * lucky egg. The shiny colors are free (they don't touch the run).
 */
export const challengeProblem = (start: ReplayStart, day: DayKey): ChallengeProblem | null => {
  const c = dailyChallenge(day)
  if (start.seed !== c.seed) return 'seed'
  if (start.starter !== c.starter) return 'starter'
  if (start.difficulty !== c.difficulty) return 'difficulty'
  if (UPGRADE_IDS.some((id) => start.ranks[id] !== 0)) return 'ranks'
  if (start.lure || start.incense || start.luckyEgg) return 'items'
  return start.outbreak === c.outbreak ? null : 'outbreak'
}

/** Whether a challenge run of `day` may start at `now`: on its day, or just after it ended (`CHALLENGE.graceMs`). */
export const challengeOpen = (day: DayKey, now: Date) => {
  const today = brasiliaDay(now)
  return day === today || (day === previousDay(today) && msSinceDayStart(now) < CHALLENGE.graceMs)
}

/** Whether `day`'s ribbons can go out at `now`: it ended at least `CHALLENGE.settleMs` ago. */
export const ribbonsDue = (day: DayKey, now: Date) => {
  const yesterday = previousDay(brasiliaDay(now))
  return day < yesterday || (day === yesterday && msSinceDayStart(now) >= CHALLENGE.settleMs)
}

/* ---------------- The player's attempt ---------------- */

/** The official attempt this device knows of: its day and the time it lasted. */
export type Attempt = { day: DayKey; time: number }

/**
 * Whether the next challenge run of `day` is the official attempt: neither
 * this device nor the server (`attempted`, signed in; null when it didn't
 * say) knows of a finished one. Either one is enough to make it practice, so
 * an attempt still queued offline, or played as a guest, isn't announced as
 * official again.
 */
export const nextIsOfficial = (day: DayKey, local: Attempt | null, attempted: boolean | null) => attempted !== true && local?.day !== day
