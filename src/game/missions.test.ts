import { describe, expect, it } from 'vitest'
import { MISSION_SLOTS } from '../data/missions'
import { dayKey, drawMissions, goalValue, missionStatus, NO_MISSIONS, parseMissions, periodEnd, periodKey, recordHatchMissions, recordMissions, type Mission } from './missions'
import { bagCount } from './bag'
import { EMPTY_SAVE, recordRun } from './meta'
import { summary } from './tally.fixture'

/** Local time, like the player's clock. Months are 1-based here. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min)

const ids = (missions: Mission[]) => missions.map((m) => m.id)

/** First day of October 2026 whose dailies include a mission of `kind`. */
const dayWith = (kind: Mission['goal']['kind']) => {
  for (let d = 1; d <= 31; d++) {
    const date = at(2026, 10, d)
    const mission = drawMissions('daily', date).find((m) => m.goal.kind === kind)
    if (mission) return { date, mission }
  }
  throw new Error(`no ${kind} mission in October`)
}

describe('mission draw', () => {
  it('gives the same missions all day and new ones after local midnight', () => {
    expect(ids(drawMissions('daily', at(2026, 10, 13, 0, 0)))).toEqual(ids(drawMissions('daily', at(2026, 10, 13, 23, 59))))
    expect(dayKey(at(2026, 10, 13, 23, 59))).toBe('2026-10-13')
    expect(dayKey(at(2026, 10, 14, 0, 0))).toBe('2026-10-14')
    // Over a month, the days don't all repeat the same set.
    const sets = new Set(Array.from({ length: 30 }, (_, d) => ids(drawMissions('daily', at(2026, 10, d + 1))).join()))
    expect(sets.size).toBeGreaterThan(20)
  })

  it('draws one mission per template, three a day and two a week', () => {
    const daily = drawMissions('daily', at(2026, 10, 13))
    expect(daily).toHaveLength(MISSION_SLOTS.daily)
    expect(drawMissions('weekly', at(2026, 10, 13))).toHaveLength(MISSION_SLOTS.weekly)
    expect(new Set(daily.map((m) => m.goal.kind)).size).toBe(daily.length)
  })

  it('keeps the week from Monday 00:00 to Sunday 23:59, across months', () => {
    // 2026-10-26 is a Monday; Sunday 2026-11-01 ends that week.
    const week = periodKey('weekly', at(2026, 10, 26, 0, 0))
    expect(week).toBe('2026-10-26')
    expect(periodKey('weekly', at(2026, 11, 1, 23, 59))).toBe(week)
    expect(periodKey('weekly', at(2026, 10, 25, 23, 59))).toBe('2026-10-19')
    expect(periodKey('weekly', at(2026, 11, 2, 0, 0))).toBe('2026-11-02')
    expect(ids(drawMissions('weekly', at(2026, 10, 26, 0, 0)))).toEqual(ids(drawMissions('weekly', at(2026, 11, 1, 23, 59))))
  })

  it('knows when each period ends', () => {
    expect(periodEnd('daily', at(2026, 10, 31, 18))).toEqual(at(2026, 11, 1, 0))
    expect(periodEnd('weekly', at(2026, 10, 29, 18))).toEqual(at(2026, 11, 2, 0))
  })
})

describe('mission progress', () => {
  it('adds runs up and pays a mission once, when it completes', () => {
    const { date, mission } = dayWith('kills')
    const first = recordMissions(NO_MISSIONS, summary({ kills: mission.target - 10 }), null, date)
    expect(first.completed).toEqual([])
    expect(first.missions.daily.progress[mission.id]).toBe(mission.target - 10)
    const second = recordMissions(first.missions, summary({ kills: 50 }), null, date)
    expect(second.completed.map((m) => m.id)).toContain(mission.id)
    expect(second.missions.daily.progress[mission.id]).toBe(mission.target)
    expect(recordMissions(second.missions, summary({ kills: 999 }), null, date).completed).toEqual([])
  })

  it("counts the day's outbreak defeated, and pays its item into the bag", () => {
    const { date, mission } = dayWith('outbreakKills')
    expect(mission.item).toBe('lure')
    expect(goalValue(mission.goal, summary({ kills: 900, outbreakKills: 240 }))).toBe(240)
    const run = summary({ outbreakKills: mission.target })
    const record = recordRun({ ...EMPTY_SAVE }, run, null, date)
    expect(record.items).toContain('lure')
    expect(bagCount(record.save.bag, 'lure')).toBeGreaterThanOrEqual(1)
  })

  it('counts only what changed since the snapshot already recorded for the same run', () => {
    const { date, mission } = dayWith('kills')
    const atVictory = summary({ kills: 100, victory: true })
    const once = recordMissions(NO_MISSIONS, atVictory, null, date).missions
    expect(recordMissions(once, atVictory, atVictory, date).missions).toEqual(once)
    const later = recordMissions(once, summary({ kills: 130, victory: true }), atVictory, date).missions
    expect(later.daily.progress[mission.id]).toBe(130)
  })

  it('keeps the best single run for survival goals', () => {
    const { date, mission } = dayWith('survive')
    const type = mission.goal.kind === 'survive' ? mission.goal.type : undefined
    const starter = type === 'grass' ? 'bulbasaur' : type === 'water' ? 'squirtle' : 'charmander'
    const long = recordMissions(NO_MISSIONS, summary({ starter, time: 4 * 60 + 30 }), null, date).missions
    const short = recordMissions(long, summary({ starter, time: 2 * 60 }), null, date).missions
    expect(short.daily.progress[mission.id]).toBe(4)
    // A starter of another type doesn't count.
    const other = starter === 'charmander' ? 'squirtle' : 'charmander'
    expect(goalValue(mission.goal, summary({ starter: other, time: 900 }))).toBe(0)
  })

  it('starts over on a new day and shows progress capped at the target', () => {
    const { date, mission } = dayWith('kills')
    const done = recordMissions(NO_MISSIONS, summary({ kills: 99_999 }), null, date).missions
    expect(missionStatus(done, date).find((m) => m.id === mission.id)).toMatchObject({ progress: mission.target, done: true })
    const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    expect(missionStatus(done, tomorrow).filter((m) => m.period === 'daily').every((m) => m.progress === 0)).toBe(true)
  })

  it('counts hatched eggs outside runs, and only for hatch goals', () => {
    const date = Array.from({ length: 20 }, (_, w) => at(2026, 10, 5 + w * 7)).find((d) => drawMissions('weekly', d).some((m) => m.goal.kind === 'hatches'))!
    const mission = drawMissions('weekly', date).find((m) => m.goal.kind === 'hatches')!
    expect(mission.egg).toBe('common')
    expect(recordMissions(NO_MISSIONS, summary({ kills: 50, steps: 900 }), null, date).missions.weekly.progress[mission.id]).toBeUndefined()
    const hatched = recordHatchMissions(NO_MISSIONS, date)
    expect(hatched.missions.weekly.progress[mission.id]).toBe(1)
    expect(Object.keys(hatched.missions.weekly.progress)).toEqual([mission.id])
    expect(hatched.completed.map((m) => m.id)).toEqual(mission.target === 1 ? [mission.id] : [])
  })

  it('parses boards field by field', () => {
    expect(parseMissions(undefined)).toEqual(NO_MISSIONS)
    expect(parseMissions({ daily: { key: '2026-10-13', progress: { 'kills:500': 12.7, bad: 'x' } }, weekly: 3 })).toEqual({
      daily: { key: '2026-10-13', progress: { 'kills:500': 12, bad: 0 } },
      weekly: NO_MISSIONS.weekly,
    })
  })
})
