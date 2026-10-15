import { createRng, pick, seedFrom, type Rng } from '../engine/rng'
import type { BagItem } from './bag'
import type { EggTier } from './eggs'
import { DAILY_POOL, MISSION_SLOTS, WEEKLY_POOL, type MissionGoal, type MissionPeriod, type MissionTemplate } from '../data/missions'
import { isHatchling } from '../data/hatchlings'
import { STARTERS } from '../data/starters'
import type { PokeType } from '../data/types'
import { overtime } from './endless'
import { isRecord, wholeNumber } from './parse'
import type { RunSummary } from './tally'

/**
 * Daily and weekly missions: drawn from the local date, so the same day (or
 * week) always gives the same missions, and progressed from run summaries.
 * Everything here is pure; the shell persists the boards in the save.
 */

/** `egg`: an egg of that tier comes with the ₽; `item`: one of that item goes into the bag. */
export type Mission = { id: string; period: MissionPeriod; goal: MissionGoal; target: number; reward: number; egg?: EggTier; item?: BagItem }

export const MISSION_PERIODS = Object.keys(MISSION_SLOTS) as MissionPeriod[]

/* ---------------- Calendar ---------------- */

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day, `YYYY-MM-DD`. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Local midnight of the Monday that starts `d`'s week. */
const weekStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))

/** Key of a period: the day, or the Monday that starts the week. */
export const periodKey = (period: MissionPeriod, d: Date) => dayKey(period === 'daily' ? d : weekStart(d))

/** When the period holding `d` ends: the next local midnight, or the next Monday. */
export const periodEnd = (period: MissionPeriod, d: Date) => {
  const start = period === 'daily' ? d : weekStart(d)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + (period === 'daily' ? 1 : 7))
}

/* ---------------- Draw ---------------- */

/** The first `n` items of a seeded shuffle. */
const sample = <T>(rng: Rng, items: readonly T[], n: number) => {
  const rest = [...items]
  return Array.from({ length: Math.min(n, rest.length) }, () => rest.splice(Math.floor(rng() * rest.length), 1)[0]!)
}

/** Stable id of a goal and target, e.g. `typeKills:ghost:80`. Progress is stored under it. */
const missionId = (goal: MissionGoal, target: number) => [...Object.values(goal), target].join(':')

const POOLS: Record<MissionPeriod, readonly MissionTemplate[]> = { daily: DAILY_POOL, weekly: WEEKLY_POOL }

/** The missions of the period holding `date`, one per drawn template, seeded by the period's key. */
export const drawMissions = (period: MissionPeriod, date: Date): Mission[] => {
  const rng = createRng(seedFrom(`${period}:${periodKey(period, date)}`))
  return sample(rng, POOLS[period], MISSION_SLOTS[period]).map((template) => {
    const goal = pick(rng, template.goals)
    const [target, reward] = pick(rng, template.tiers)
    return { id: missionId(goal, target), period, goal, target, reward, ...(template.egg && { egg: template.egg }), ...(template.item && { item: template.item }) }
  })
}

/* ---------------- Progress ---------------- */

/** Goals that keep the best single run instead of adding runs up. */
export const BEST_GOALS: ReadonlySet<MissionGoal['kind']> = new Set(['survive', 'level', 'endless', 'species'])

/** No type: any Pokémon. With a type: a starter of that type (hatched families don't count, like the goal text says). */
const starterIs = (s: RunSummary, type: PokeType | undefined) =>
  !type || (!isHatchling(s.starter) && STARTERS[s.starter].line[0].types.some((t) => t === type))

/** What a run is worth towards a goal. */
export const goalValue = (goal: MissionGoal, s: RunSummary): number => {
  switch (goal.kind) {
    case 'kills': return s.kills
    case 'typeKills': return s.killsByType[goal.type] ?? 0
    case 'weatherKills': return s.killsByWeather[goal.weather] ?? 0
    case 'biomeKills': return s.killsByBiome[goal.biome] ?? 0
    case 'traitKills': return s.traitKills
    case 'shinyKills': return s.shinyKills
    case 'outbreakKills': return s.outbreakKills
    case 'bossKills': return s.bossKills
    case 'rifts': return s.legends.length
    case 'chests': return s.chests
    case 'meowths': return s.meowths
    case 'altars': return s.altars
    case 'coins': return s.coins
    case 'moveEvolutions': return s.moveEvolutions
    case 'wins': return s.victory && starterIs(s, goal.type) ? 1 : 0
    case 'survive': return starterIs(s, goal.type) ? Math.floor(s.time / 60) : 0
    case 'level': return s.level
    case 'endless': return s.victory ? Math.floor(overtime(s.time) / 60) : 0
    case 'steps': return s.steps
    case 'species': return s.species
    // Eggs hatch outside runs: see `recordHatchMissions`.
    case 'hatches': return 0
  }
}

/** Progress per mission id for one period; `key` says which day or week it belongs to. */
export type MissionBoard = { key: string; progress: Readonly<Record<string, number>> }

export type MissionsSave = Readonly<Record<MissionPeriod, MissionBoard>>

export const NO_MISSIONS: MissionsSave = { daily: { key: '', progress: {} }, weekly: { key: '', progress: {} } }

/** The board of the period holding `date`. A board from an older period starts over. */
const boardFor = (save: MissionsSave, period: MissionPeriod, date: Date): MissionBoard => {
  const key = periodKey(period, date)
  return save[period].key === key ? save[period] : { key, progress: {} }
}

export type MissionStatus = Mission & { progress: number; done: boolean }

/** Today's and this week's missions with their progress, dailies first. */
export const missionStatus = (save: MissionsSave, date: Date): MissionStatus[] =>
  MISSION_PERIODS.flatMap((period) => {
    const board = boardFor(save, period, date)
    return drawMissions(period, date).map((m) => {
      const progress = Math.min(m.target, board.progress[m.id] ?? 0)
      return { ...m, progress, done: progress >= m.target }
    })
  })

/**
 * Adds a run to the current boards and lists the missions it completed.
 * `before` is what was already recorded for this same run (a victory is
 * recorded, then the run may go on in endless mode): only the difference counts,
 * so recording the same summary twice changes nothing.
 */
export const recordMissions = (save: MissionsSave, summary: RunSummary, before: RunSummary | null, date: Date) =>
  advanceMissions(save, date, (m, was) => {
    const now = goalValue(m.goal, summary)
    return BEST_GOALS.has(m.goal.kind) ? now : was + now - (before ? goalValue(m.goal, before) : 0)
  })

/** Adds a hatched egg to the current boards (`hatches` goals) and lists the missions it completed. */
export const recordHatchMissions = (save: MissionsSave, date: Date) => advanceMissions(save, date, (m, was) => (m.goal.kind === 'hatches' ? was + 1 : was))

/** Moves every open mission of the current boards to `next(mission, progress)`; progress never goes back. */
const advanceMissions = (save: MissionsSave, date: Date, next: (m: Mission, was: number) => number) => {
  const completed: Mission[] = []
  const boards = MISSION_PERIODS.map((period) => {
    const board = boardFor(save, period, date)
    const progress = { ...board.progress }
    for (const m of drawMissions(period, date)) {
      const was = progress[m.id] ?? 0
      if (was >= m.target) continue
      const value = Math.min(m.target, Math.max(was, next(m, was)))
      if (value === was) continue
      progress[m.id] = value
      if (value >= m.target) completed.push(m)
    }
    return [period, { key: board.key, progress }] as const
  })
  return { missions: Object.fromEntries(boards) as Record<MissionPeriod, MissionBoard>, completed }
}

/* ---------------- Save ---------------- */

/**
 * Two boards of the same period. The most recent day (or week) wins; on the
 * same one each mission keeps the most progress. Rewards were paid where a
 * mission was completed, so merging pays nothing.
 */
const mergeBoard = (a: MissionBoard, b: MissionBoard): MissionBoard => {
  if (a.key !== b.key) return a.key > b.key ? a : b
  const progress = { ...a.progress }
  for (const [id, v] of Object.entries(b.progress)) progress[id] = Math.max(progress[id] ?? 0, v)
  return { key: a.key, progress }
}

export const mergeMissions = (a: MissionsSave, b: MissionsSave): MissionsSave => ({ daily: mergeBoard(a.daily, b.daily), weekly: mergeBoard(a.weekly, b.weekly) })

const parseBoard = (raw: unknown): MissionBoard => {
  if (!isRecord(raw) || typeof raw.key !== 'string') return NO_MISSIONS.daily
  const progress = isRecord(raw.progress) ? raw.progress : {}
  return { key: raw.key, progress: Object.fromEntries(Object.entries(progress).map(([id, v]) => [id, wholeNumber(v)])) }
}

/** Parses the `missions` field of the save, board by board; anything malformed starts empty. */
export const parseMissions = (raw: unknown): MissionsSave => {
  const data = isRecord(raw) ? raw : {}
  return { daily: parseBoard(data.daily), weekly: parseBoard(data.weekly) }
}
