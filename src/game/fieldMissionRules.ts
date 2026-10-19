import { clamp, dirTo, type Vec } from '../engine/math'
import type { Rng } from '../engine/rng'
import { EVENTS, RUN_LENGTH } from '../data/waves'
import type { Difficulty } from './difficulty'
import { spawnSpot } from './mapEventRules'
import * as dm from '../engine/dmath'

/**
 * Pure rules and tuning of the field missions (`fieldMissions.ts`): timed
 * goals placed a walk away from the player that pay well for leaving their spot.
 * No game state here, so the tests read them directly.
 */

/** The lost Pokémon of the escort, streamed like Meowth (`EXTRAS` in `main.ts`, CRITTERS in `scripts/dex.mjs`). */
export const TOGEPI_DEX = 175

export const FIELD_MISSION_KINDS = ['defense', 'collect', 'escort'] as const
export type FieldMissionKind = (typeof FIELD_MISSION_KINDS)[number]

/** The missions' own director: one at a time, every couple of minutes, never over a boss's entrance. */
export const FIELD = {
  /** Earliest start (s). Onix's entrance at 2:30 pushes it to about 3:15. */
  first: 150,
  /** Seconds from one mission's start to the next one's. */
  gap: [120, 170],
  /** Px from the player a mission is placed at. */
  distance: [350, 600],
  /** No mission starts this many seconds before / after a wave boss arrives. */
  quiet: [25, 45],
  /** None starts this close to Mewtwo. */
  lastStart: RUN_LENGTH - 90,
  /** Seconds to wait before trying again when no open spot was found. */
  retry: 6,
} as const

/** Ground layout of each mission (px). */
export const NEST = {
  /** Stand inside this ring to defend the egg. */
  radius: 44,
  /** The egg's body: raiders this close bite it. */
  egg: 9,
  /** Raiders spawn on this ring around the nest. */
  spawn: 190,
  /** A raider this close to the player turns on the player instead. */
  aggro: 46,
} as const

export const BALLS = {
  /** Spread of the lost Poké Balls around the mission's center. */
  spread: [50, 220],
  spacing: 70,
  /** Step this close to pick one up. */
  reach: 12,
  /** Guards appear on this ring around a ball as it's picked. */
  guardRing: 120,
} as const

export const ESCORT = {
  /** Togepi follows a player this close… */
  leash: 110,
  /** …stopping this close to them. */
  near: 18,
  /** Px/s; the player's base speed is 68, so it lags a little. */
  speed: 58,
  /** The nest is this far from where Togepi got lost. */
  home: [280, 360],
  /** Togepi this close to the nest is home. */
  arrive: 20,
  /** Togepi's body: wild Pokémon this close hurt it. */
  body: 8,
} as const

export type FieldTuning = {
  defense: {
    /** Seconds to reach the nest before the egg is lost anyway. */
    reach: number
    /** Seconds inside the ring that save it. */
    hold: number
    /** Egg HP and what each raider at it bites per second. */
    hp: number
    bite: number
    /** A raid wave every `every` s: `raiders` plus `perMinute` per minute played, the first `elites` of each as elites. */
    every: number
    raiders: number
    perMinute: number
    elites: number
    /** Raiders alive at once. */
    max: number
  }
  collect: {
    /** Seconds to find every ball. */
    time: number
    balls: number
    /** Wild Pokémon that ambush each ball as it's picked, elites or not. */
    guards: number
    eliteGuards: boolean
  }
  escort: {
    time: number
    /** Togepi's HP and what each wild Pokémon touching it takes per second. */
    hp: number
    bite: number
  }
  reward: {
    /** ₽50 coins on success, plus one more every `coinMinutes` minutes. */
    coins: number
    coinMinutes: number
    /** The lucky level-up's first card is shiny (a free pick). */
    shinyCard: boolean
    /** Odds the defended egg is yours to keep (`awardEgg`, within the run's egg cap). */
    egg: number
  }
}

/**
 * Per difficulty: Nightmare has tighter clocks and nastier guards (elite
 * raiders, elite ambushes at every ball) but pays more.
 */
export const FIELD_TUNING = {
  normal: {
    defense: { reach: 50, hold: 25, hp: 100, bite: 5, every: 3.5, raiders: 4, perMinute: 0.5, elites: 0, max: 36 },
    collect: { time: 60, balls: 5, guards: 0, eliteGuards: false },
    escort: { time: 80, hp: 100, bite: 6 },
    reward: { coins: 3, coinMinutes: 3, shinyCard: false, egg: 0.35 },
  },
  hard: {
    defense: { reach: 45, hold: 27, hp: 100, bite: 6, every: 3, raiders: 5, perMinute: 0.6, elites: 1, max: 44 },
    collect: { time: 55, balls: 5, guards: 4, eliteGuards: false },
    escort: { time: 70, hp: 100, bite: 8 },
    reward: { coins: 4, coinMinutes: 3, shinyCard: false, egg: 0.5 },
  },
  nightmare: {
    defense: { reach: 40, hold: 30, hp: 100, bite: 9, every: 2.4, raiders: 6, perMinute: 0.8, elites: 3, max: 56 },
    collect: { time: 44, balls: 6, guards: 5, eliteGuards: true },
    escort: { time: 56, hp: 100, bite: 12 },
    reward: { coins: 6, coinMinutes: 2, shinyCard: true, egg: 0.7 },
  },
} as const satisfies Record<Difficulty, FieldTuning>

/* ---------------- Schedule ---------------- */

const BOSS_TIMES = EVENTS.flatMap((e) => (e.kind === 'boss' ? [e.at] : []))

/** The first time at or after `t` that no wave boss's entrance is near (`FIELD.quiet`). */
export const clearOfBosses = (t: number) => {
  let at = t
  for (const boss of BOSS_TIMES) if (at > boss - FIELD.quiet[0] && at < boss + FIELD.quiet[1]) at = boss + FIELD.quiet[1]
  return at
}

/** When the mission after one started at `now` may start (`roll` in [0, 1) picks the gap). */
export const nextMissionAt = (now: number, roll: number) => clearOfBosses(now + FIELD.gap[0] + (FIELD.gap[1] - FIELD.gap[0]) * roll)

/** Missions rotate through every kind before one repeats: the kinds not run in this cycle yet. */
export const freshKinds = (done: readonly FieldMissionKind[]): readonly FieldMissionKind[] => {
  const cycle = done.slice(done.length - (done.length % FIELD_MISSION_KINDS.length))
  return FIELD_MISSION_KINDS.filter((k) => !cycle.includes(k))
}

/* ---------------- Missions ---------------- */

/** Defense progress (0..1) after `dt`: it only runs while the player stands in the ring. */
export const defenseProgress = (progress: number, inside: boolean, dt: number, hold: number) => clamp(progress + (inside ? dt / hold : 0), 0, 1)

/** Spots for `n` lost Poké Balls around (cx, cy), kept apart so collecting them is a tour. Fewer when the ring is crowded. */
export const ballSpots = (rng: Rng, cx: number, cy: number, n: number): Vec[] => {
  const spots: Vec[] = []
  for (let i = 0; i < n * 3 && spots.length < n; i++) {
    const spot = spawnSpot(rng, cx, cy, BALLS.spread, spots, BALLS.spacing)
    if (spot) spots.push(spot)
  }
  return spots
}

/** Togepi's step toward the player: it trails them inside the leash, stops close by, and waits when they run too far ahead. */
export const followStep = (tx: number, ty: number, px: number, py: number, dt: number): Vec => {
  const dist = dm.hypot(px - tx, py - ty)
  if (dist <= ESCORT.near || dist > ESCORT.leash) return { x: tx, y: ty }
  const d = dirTo(tx, ty, px, py)
  const len = Math.min(ESCORT.speed * dt, dist - ESCORT.near)
  return { x: tx + d.x * len, y: ty + d.y * len }
}

/** ₽50 coins a finished mission pays at `time`. */
export const missionCoins = (time: number, reward: FieldTuning['reward']) => reward.coins + Math.floor(time / 60 / reward.coinMinutes)
