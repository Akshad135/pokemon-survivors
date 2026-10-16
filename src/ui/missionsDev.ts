import { ACHIEVEMENT_IDS, type AchievementId } from '../data/achievements'
import { NO_ACHIEVEMENTS } from '../game/achievements'
import { addToBag } from '../game/bag'
import { dayKey, missionStatus, NO_MISSIONS, periodKey } from '../game/missions'
import { loadSave, setToday, today, writeSave } from './save'

/**
 * Dev console helpers for missions and achievements (`ps.*` in dev builds).
 * Missions are indexed like the screen lists them: dailies 0-2, weeklies 3-4.
 */
export const missionDevTools = (refresh: () => void) => {
  /** Sets mission `i`'s progress (default: one short of done, so the next run completes it). Pays nothing. */
  const mission = (i: number, value?: number) => {
    const save = loadSave()
    const m = missionStatus(save.missions, today())[i]
    if (!m) return 'Missions: 0-2 daily, 3-4 weekly'
    // A board from an older day or week starts over, like in `recordMissions`.
    const key = periodKey(m.period, today())
    const board = save.missions[m.period].key === key ? save.missions[m.period] : { key, progress: {} }
    const progress = { ...board.progress, [m.id]: Math.min(m.target, value ?? m.target - 1) }
    writeSave({ ...save, missions: { ...save.missions, [m.period]: { ...board, progress } } })
    refresh()
    return `${m.id}: ${progress[m.id]}/${m.target}`
  }
  return {
    /** Today's and this week's missions with progress. */
    missions: () => console.table(missionStatus(loadSave().missions, today()).map(({ id, period, progress, target, reward }) => ({ id, period, progress, target, reward }))),
    mission,
    /** Completes mission `i` and pays its reward (₽ and its bag item). */
    completeMission: (i: number) => {
      const m = missionStatus(loadSave().missions, today())[i]
      if (!m) return 'Missions: 0-2 daily, 3-4 weekly'
      const result = mission(i, m.target)
      const save = loadSave()
      writeSave({ ...save, wallet: save.wallet + m.reward, bag: m.item ? addToBag(save.bag, m.item) : save.bag })
      refresh()
      return result
    },
    /** Moves the missions' clock to a local day (`ps.date('2026-10-19')`), or back to now. */
    date: (iso?: string) => {
      setToday(iso ? new Date(`${iso}T12:00`) : null)
      refresh()
      return dayKey(today())
    },
    /** Unlocks one achievement, or all of them. Pays nothing. */
    unlockAchievement: (id?: AchievementId) => {
      const save = loadSave()
      const ids = id ? [id] : ACHIEVEMENT_IDS
      writeSave({ ...save, achievements: { ...save.achievements, unlocked: ACHIEVEMENT_IDS.filter((x) => ids.includes(x) || save.achievements.unlocked.includes(x)) } })
      refresh()
    },
    /** Wipes missions, achievements, lifetime records and the title (keeps ₽ and upgrades). */
    resetProgress: () => {
      writeSave({ ...loadSave(), missions: NO_MISSIONS, achievements: NO_ACHIEVEMENTS, title: null })
      refresh()
    },
  }
}
