/**
 * The day everyone shares: the Surto do dia, the Poké Mart's daily counter
 * and the ranking's boards all turn over at midnight in Brasília, so the
 * server can check a run against the day it started. (Missions keep the
 * player's local day.) Pure; shared with the API.
 */

export const DAY_TIME_ZONE = 'America/Sao_Paulo'

/** A day as `YYYY-MM-DD`. */
export type DayKey = string

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: DAY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

/** The wall clock in Brasília at `d`, as numbers. */
const clockAt = (d: Date) => {
  const parts = Object.fromEntries(DAY_FORMAT.formatToParts(d).map((p) => [p.type, p.value]))
  return { day: `${parts.year}-${parts.month}-${parts.day}`, seconds: Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second) }
}

/** The Brasília day holding `d`, `YYYY-MM-DD`. */
export const brasiliaDay = (d: Date): DayKey => clockAt(d).day

/** The day before `day` (calendar arithmetic, no time zone involved). */
export const previousDay = (day: DayKey): DayKey => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! - 1)).toISOString().slice(0, 10)
}

/** Milliseconds from `d` to the next midnight in Brasília (when the day's outbreak and counter turn over). */
export const msToNextDay = (d: Date) => (86_400 - clockAt(d).seconds) * 1000 - d.getMilliseconds()
