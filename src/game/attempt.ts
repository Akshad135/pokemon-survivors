import { isDayKey, type DayKey } from './day'
import { isRecord } from './parse'

/**
 * The player's official Desafio do dia attempt, as the save knows it (the
 * save's `attempt`, synced like the rest, so another device of the account
 * shows practice too). Only a hint for the screens: the API decides which run
 * is official (the first of the day to finish).
 */

/** The last official attempt finished: its day and the time it lasted. */
export type Attempt = { day: DayKey; time: number }

/**
 * Whether the next challenge run of `day` is the official attempt: neither
 * the save (`local`) nor the server (`attempted`, signed in; null when it
 * didn't say) knows of a finished one. Either one is enough to make it
 * practice, so an attempt still queued offline, or played as a guest, isn't
 * announced as official again.
 */
export const nextIsOfficial = (day: DayKey, local: Attempt | null, attempted: boolean | null) => attempted !== true && local?.day !== day

/** The save's `attempt`, or null when missing or malformed. */
export const parseAttempt = (v: unknown): Attempt | null =>
  isRecord(v) && isDayKey(v.day) && typeof v.time === 'number' && Number.isFinite(v.time) && v.time >= 0 ? { day: v.day, time: v.time } : null

/**
 * The later of two attempts. On the same day (two devices that played it
 * apart) `base` stays: the account had it first, as the API's first to finish
 * most likely was.
 */
export const mergeAttempts = (base: Attempt | null, incoming: Attempt | null): Attempt | null =>
  !base ? incoming : !incoming || incoming.day <= base.day ? base : incoming
