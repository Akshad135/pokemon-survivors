import { API_URL, sessionToken } from './account'
import type { PollOptionId } from './data/supporters'
import { isRecord } from './game/parse'
import { parsePoll, parseSupporterStatus, parseWall, type Poll, type SupporterStatus, type SupporterTier, type WallEntry } from './game/supporters'

/**
 * The supporters' side of the API (`server/`): the player's own standing,
 * redeeming a donation's code, the wall and the poll. Like `ranking.ts`,
 * every call fails soft (null), so the screens just say they're out of reach.
 */

const TIMEOUT_MS = 10_000

/** A call to the API, with the player's token when there is one: its status and JSON body (status 0 offline). */
const call = async (path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}) => {
  try {
    const token = init.auth ? await sessionToken() : null
    if (init.auth && !token) return { status: 0, body: null }
    const res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return { status: res.status, body: (await res.json().catch(() => null)) as unknown }
  } catch {
    return { status: 0, body: null }
  }
}

/** The signed-in player's standing, or null (guest, offline). */
export const fetchSupporterStatus = async (): Promise<SupporterStatus | null> => {
  const { status, body } = await call('/me/supporter', { auth: true })
  return status === 200 ? parseSupporterStatus(body) : null
}

/** Shows or hides the player's badge and name. Their standing after it, or null when it didn't go through. */
export const setSupporterPublic = async (show: boolean): Promise<SupporterStatus | null> => {
  const { status, body } = await call('/me/supporter', { method: 'PUT', body: { public: show }, auth: true })
  return status === 200 ? parseSupporterStatus(body) : null
}

/** What redeeming a code came to: the tier the account has now, or why not. */
export type Redeemed = { ok: true; tier: SupporterTier | null } | { ok: false; reason: 'unknown' | 'used' | 'offline' }

/** Redeems a donation's code (already normalized by `parseCode`) for the signed-in player. */
export const redeemCode = async (code: string): Promise<Redeemed> => {
  const { status, body } = await call('/donations/redeem', { method: 'POST', body: { code }, auth: true })
  if (status === 200) return { ok: true, tier: parseSupporterStatus(body)?.tier ?? null }
  if (status === 404) return { ok: false, reason: 'unknown' }
  if (status === 409) return { ok: false, reason: 'used' }
  return { ok: false, reason: 'offline' }
}

let wall: Promise<WallEntry[] | null> | null = null

/** The wall, asked once per page (a failure asks again next time). Null when the API can't be reached. */
export const fetchWall = () =>
  (wall ??= call('/supporters').then(({ status, body }) => {
    if (status !== 200 || !isRecord(body)) {
      wall = null
      return null
    }
    return parseWall(body.supporters)
  }))

/** The current poll, or null when the API can't be reached. */
export const fetchPoll = async (): Promise<Poll | null> => {
  const { status, body } = await call('/poll')
  return status === 200 ? parsePoll(body) : null
}

/** A supporter's vote. The poll after it, `denied` for anyone who isn't a supporter, null offline. */
export const vote = async (choice: PollOptionId): Promise<Poll | 'denied' | null> => {
  const { status, body } = await call('/poll', { method: 'PUT', body: { choice }, auth: true })
  if (status === 403) return 'denied'
  return status === 200 ? parsePoll(body) : null
}
