import { ribbonsDue } from '../../src/game/challenge'
import { brasiliaDay, previousDay, type DayKey } from '../../src/game/day'
import { ribbonFor } from '../../src/game/ribbons'
import type { GiftStore } from './gifts'
import type { RankingStore } from './ranking'

/** How often the ribbon job looks for a day to close. */
const EVERY_MS = 15 * 60_000

/**
 * The Desafio do dia's ribbons: once a day has closed (`ribbonsDue`), ranks
 * its verified official attempts (`ribbonPlaces`) and sends each player a
 * Mystery Gift with their ribbon (`ribbonFor`). Each gift's key is the day
 * (`ribbon:2026-10-15`), so running it again sends nothing twice: `tick`
 * looks at the last two days every `EVERY_MS` (a server that was down
 * catches up, and a run verified late still gets its ribbon).
 */
export const createRibbons = (ranking: Pick<RankingStore, 'ribbonPlaces'>, gifts: Pick<GiftStore, 'sendAll'>) => {
  /** Sends `day`'s ribbons. How many players it went over. */
  const award = async (day: DayKey) => {
    const places = await ranking.ribbonPlaces(day)
    await gifts.sendAll(
      places.map((p) => ({
        userId: p.user_id,
        content: { kind: 'ribbon', ribbon: { day, tier: ribbonFor(p.rank, p.total), rank: p.rank, total: p.total } } as const,
        key: `ribbon:${day}`,
      })),
    )
    return places.length
  }

  const tick = async (now = new Date()) => {
    const yesterday = previousDay(brasiliaDay(now))
    for (const day of [previousDay(yesterday), yesterday].filter((d) => ribbonsDue(d, now))) {
      try {
        const n = await award(day)
        if (n > 0) console.log(`ribbons of ${day}: ${n} players`)
      } catch (err) {
        console.error('ribbons failed', day, err)
      }
    }
  }

  return {
    award,
    tick,
    /** Runs `tick` now and every `EVERY_MS`, without keeping the process alive. */
    start: () => {
      void tick()
      setInterval(() => void tick(), EVERY_MS).unref()
    },
  }
}
