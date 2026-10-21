import { track } from './analytics'
import { accountHandle, accountUserId, API_URL, sessionToken, storedRef, storeRef } from './account'
import type { EnemyId } from './data/enemies'
import type { PlayableId } from './data/hatchlings'
import type { Difficulty } from './game/difficulty'
import { isRecord } from './game/parse'
import type { DayKey } from './game/day'
import { isOutbreakSpecies } from './game/outbreak'
import { parseChallengePlace, parseRunResult, type Board, type BoardPeriod, type ChallengeBoard, type ChallengePlace, type PublicProfile, type RunRanks, type RunResult } from './game/ranking'
import { firstTouch, landingRef, parseInvites, REF_PARAM } from './game/referral'
import type { Replay } from './game/replay'
import { ROUTES, SITE_URL } from './site/routes'
import { locale } from './i18n'

/**
 * Ranked runs and the public side of accounts (boards, profiles, follows),
 * through the API (`server/`). Like `account.ts`, nothing here may block the
 * game: a signed-in player's next run gets its start token and seed ahead, on
 * the menus (a run that starts without one plays unranked), its result
 * waits in a queue in `localStorage` until the API takes it, and every read
 * fails soft (null), so the screens just say the ranking is out of reach.
 */

/** The boards and profiles read from the API; ranked runs also need an account. */
export const rankingEnabled = Boolean(API_URL)

const TIMEOUT_MS = 10_000

/** The API, with the player's token when there is one. Rejects offline. */
const call = (path: string, token: string | null, init: RequestInit = {}) =>
  fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

/** A JSON body, or null when the call failed or answered an error. */
const read = async (path: string, token: string | null, init?: RequestInit) => {
  try {
    const res = await call(path, token, init)
    const body: unknown = res.ok ? await res.json() : null
    return { status: res.status, body }
  } catch {
    return { status: 0, body: null }
  }
}

/* ---------------- Ranked runs ---------------- */

const QUEUE_KEY = 'ps:runs'

/** Results kept for the API at most (a replay records up to ~450 KB an hour); older ones give way. */
const MAX_PENDING = 10

/**
 * A run result waiting for the API, under the start token of the player who
 * played it, with its replay for the server to re-simulate (checked there).
 */
type Pending = { userId: string; token: string; result: RunResult; replay: unknown }

const readQueue = (): Pending[] => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    if (!Array.isArray(data)) return []
    return data.flatMap((p: unknown) => {
      const result = isRecord(p) ? parseRunResult(p.result) : null
      return isRecord(p) && result && typeof p.userId === 'string' && typeof p.token === 'string' ? [{ userId: p.userId, token: p.token, result, replay: p.replay }] : []
    })
  } catch {
    return []
  }
}

/** Keeps the newest results: when storage is full (long endless replays), the oldest give way until the rest fit. */
const writeQueue = (queue: Pending[]) => {
  for (let kept = queue.slice(-MAX_PENDING); kept.length > 0; kept = kept.slice(1)) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(kept))
      return
    } catch {
      // Full: try again without the oldest.
    }
  }
  try {
    localStorage.removeItem(QUEUE_KEY)
  } catch {
    // Storage blocked: nothing waits for the API.
  }
}

/**
 * What became of a ranked run's result: on the boards (`ranked`, with the
 * player's position, and the challenge board's for a Desafio do dia run),
 * waiting for a connection (`queued`), refused by the server (`rejected`),
 * or never ranked because its start got no token (`unranked`).
 */
export type RankOutcome = { kind: 'ranked'; ranks: RunRanks; challenge: ChallengePlace | null } | { kind: 'queued' | 'rejected' | 'unranked' }

const parseRanks = (body: unknown): RunRanks | null => {
  const ranks = isRecord(body) && isRecord(body.ranks) ? body.ranks : null
  const at = (v: unknown) => (typeof v === 'number' ? v : null)
  return ranks ? { day: at(ranks.day), week: at(ranks.week), all: at(ranks.all) } : null
}

/**
 * Sends the queued results of the signed-in player, oldest first. An answer
 * takes a result off the queue, whatever it says (a banned account's 403
 * too: it's `rejected`, never sent again); no connection, an expired
 * session or the rate limit keep it (and the rest) for next time. Returns
 * what the API said, by token.
 */
const flushOnce = async () => {
  const done = new Map<string, RankOutcome>()
  const userId = accountUserId()
  const token = userId ? await sessionToken() : null
  if (!token) return done
  for (const p of readQueue().filter((q) => q.userId === userId)) {
    const { status, body } = await read(`/runs/${p.token}`, token, { method: 'PUT', body: JSON.stringify({ ...p.result, replay: p.replay }) })
    if (status === 0 || status === 401 || status === 429 || status >= 500) break
    const ranks = parseRanks(body)
    done.set(p.token, ranks ? { kind: 'ranked', ranks, challenge: isRecord(body) ? parseChallengePlace(body.challenge) : null } : { kind: 'rejected' })
    // A newer result of the same run (endless mode) may have queued meanwhile: only this one is done.
    writeQueue(readQueue().filter((q) => q.token !== p.token || q.result.time > p.result.time))
  }
  return done
}

let flushing: Promise<Map<string, RankOutcome>> = Promise.resolve(new Map())

/** Sends what's queued (boot, end of a run). Calls take turns. Never throws. */
export const flushRuns = () => (flushing = flushing.then(flushOnce, flushOnce).catch(() => new Map<string, RankOutcome>()))

/**
 * A start token the API dealt ahead of its run, for the player `userId`, with
 * the seed the run must play (null from an API older than server seeds,
 * which takes any), the day's outbreak by the API's clock (null from an older
 * API), when it came (`dealt`: the wall clock and the page's monotonic one)
 * and the Desafio do dia day it's for (null: a regular run).
 */
type Ticket = { userId: string; day: DayKey | null; token: string; seed: number | null; outbreak: EnemyId | null; dealt: { wall: number; mono: number } }

/**
 * How long a ticket's outbreak holds. The API accepts the outbreak of the day
 * a run starts or the day before (`outbreakFits`), so one dealt less than a
 * day before the run fits whatever the device's clock says; past this, the
 * run plays the device's day instead.
 */
const OUTBREAK_HOLD_MS = 20 * 3600 * 1000

/** The ticket's outbreak while it holds, by both clocks (sleep can stall the monotonic one, a clock fix jumps the wall one). */
const heldOutbreak = (t: Ticket) => (Math.max(Date.now() - t.dealt.wall, performance.now() - t.dealt.mono) < OUTBREAK_HOLD_MS ? t.outbreak : null)

/** What a ticket in hand tells the next run: its seed and outbreak (null: the game's own). */
export type TicketPlan = { seed: number | null; outbreak: EnemyId | null }

type TicketKind = 'regular' | 'challenge'

const kindOf = (day: DayKey | null): TicketKind => (day ? 'challenge' : 'regular')

/** The tickets in hand, one per kind: the API keeps only the newest of each kind live. */
const held: Record<TicketKind, Ticket | null> = { regular: null, challenge: null }

/** Asks in flight, one per kind. */
const asking: Record<TicketKind, Promise<Ticket | null> | null> = { regular: null, challenge: null }

/** Settles once every result reported so far reached the API or the queue, so no new token replaces a run that's still reporting. */
let reporting: Promise<unknown> = Promise.resolve()

/** Whether `t` can start a run of `day` for the player signed in now. */
const fits = (t: Ticket | null, day: DayKey | null): t is Ticket => t !== null && t.userId === accountUserId() && t.day === day

/** A start token, its seed and the day's outbreak from the API, or null (guest, offline, rate limited, a challenge that closed). */
const requestTicket = async (userId: string, day: DayKey | null): Promise<Ticket | null> => {
  const session = await sessionToken()
  if (!session) return null
  const { body } = await read('/runs', session, { method: 'POST', ...(day ? { body: JSON.stringify({ challenge: day }) } : {}) })
  if (!isRecord(body) || typeof body.token !== 'string') return null
  const seed = typeof body.seed === 'number' && Number.isSafeInteger(body.seed) ? body.seed : null
  const outbreak = isOutbreakSpecies(body.outbreak) ? body.outbreak : null
  return { userId, day, token: body.token, seed, outbreak, dealt: { wall: Date.now(), mono: performance.now() } }
}

/**
 * Gets a ticket for the player's next run of this kind (`day`: a Desafio do
 * dia's) in the background, unless one is in hand, so pressing Play never
 * waits on the network. Results still queued go first: the new token replaces
 * the player's unfinished one, which may be a run that just ended. Call it
 * only between runs (menus, results), never while a ranked run plays.
 * Resolves to the ticket's seed and outbreak, null without one.
 */
export const prefetchRanked = async (day: DayKey | null = null): Promise<TicketPlan | null> => {
  const userId = accountUserId()
  const kind = kindOf(day)
  if (!rankingEnabled || !userId) return null
  const have = held[kind]
  if (fits(have, day)) return { seed: have.seed, outbreak: heldOutbreak(have) }
  asking[kind] ??= reporting
    .then(flushRuns)
    .then(() => requestTicket(userId, day))
    .then((t) => (t && accountUserId() === userId ? (held[kind] = t) : null))
    .finally(() => (asking[kind] = null))
  const got = await asking[kind]
  return fits(got, day) ? { seed: got.seed, outbreak: heldOutbreak(got) } : null
}

/**
 * A run played signed in. `submit` reports its result with the replay so far
 * and resolves once the API took it (or the queue did); reporting again only
 * sends a longer run (a victory that went on into endless mode), else it
 * answers what it did last.
 */
export type RankedRun = { submit: (result: RunResult, replay: Replay) => Promise<RankOutcome> }

/** A run that starts signed in: the seed and outbreak it must play (null: the game's own) and its ranking. */
export type RankedStart = TicketPlan & { ranked: RankedRun }

const unranked: RankedRun = { submit: () => Promise.resolve({ kind: 'unranked' }) }

/**
 * Takes the ticket in hand for a run that begins now (`challenge`: the day of
 * the Desafio do dia it plays) and restarts its clock on the API. Without one
 * (offline, rate limited, Play pressed before it came) the run is unranked
 * and plays a seed and outbreak of the game's own. Null for guests.
 */
export const startRanked = (challenge: DayKey | null = null): RankedStart | null => {
  const userId = accountUserId()
  if (!rankingEnabled || !userId) return null
  const kind = kindOf(challenge)
  const ticket = held[kind]
  if (!fits(ticket, challenge)) return { seed: null, outbreak: null, ranked: unranked }
  held[kind] = null
  const { token } = ticket
  // 409: another tab or device got a newer token since, so this one can't report.
  const live = sessionToken().then(async (session) => (session ? (await read(`/runs/${token}/start`, session, { method: 'POST' })).status !== 409 : true))
  let sent = -1
  let last: Promise<RankOutcome> = Promise.resolve({ kind: 'unranked' })
  return {
    seed: ticket.seed,
    outbreak: heldOutbreak(ticket),
    ranked: {
      submit: (result, replay) => {
        if (result.time <= sent) return last
        sent = result.time
        // A copy now: the recorder keeps writing if the run goes on.
        const recorded: unknown = JSON.parse(JSON.stringify(replay))
        last = live.then(async (ok): Promise<RankOutcome> => {
          if (!ok) return { kind: 'unranked' }
          writeQueue([...readQueue().filter((q) => q.token !== token), { userId, token, result, replay: recorded }])
          return (await flushRuns()).get(token) ?? { kind: 'queued' }
        })
        reporting = Promise.all([reporting, last])
        return last
      },
    },
  }
}

/* ---------------- Boards, profiles, follows ---------------- */

/** Which board to show (see `BoardQuery` on the server). */
export type BoardFilter = { difficulty: Difficulty; period: BoardPeriod; starter: PlayableId | null; friends: boolean }

/** A board, or null when the API can't be reached. Friends boards need an account. */
export const fetchBoard = async (f: BoardFilter): Promise<Board | null> => {
  const params = new URLSearchParams({ period: f.period, ...(f.starter ? { starter: f.starter } : {}), ...(f.friends ? { friends: '1' } : {}) })
  const { body } = await read(`/boards/${f.difficulty}?${params}`, await sessionToken())
  // Our own API: a quick look at the shape is enough, the screens only show text.
  return isRecord(body) && Array.isArray(body.entries) ? (body as Board) : null
}

/** A day's challenge board (friends only: who the player follows), or null when the API can't be reached. */
export const fetchChallengeBoard = async (day: DayKey, friends = false): Promise<ChallengeBoard | null> => {
  const { body } = await read(`/challenge/${day}${friends ? '?friends=1' : ''}`, await sessionToken())
  return isRecord(body) && Array.isArray(body.entries) && typeof body.total === 'number' ? (body as ChallengeBoard) : null
}

/** A public profile, `missing` when nobody has that handle, null when the API can't be reached. */
export const fetchProfile = async (handle: string): Promise<PublicProfile | 'missing' | null> => {
  const { status, body } = await read(`/profiles/${encodeURIComponent(handle)}`, await sessionToken())
  if (status === 404 || status === 400) return 'missing'
  return isRecord(body) && typeof body.handle === 'string' && Array.isArray(body.recent) ? (body as PublicProfile) : null
}

/** Follows or unfollows `handle`. Their follower count after it, or null when it didn't go through. */
export const setFollow = async (handle: string, follow: boolean) => {
  const token = await sessionToken()
  if (!token) return null
  const { body } = await read(`/follows/${encodeURIComponent(handle)}`, token, { method: follow ? 'PUT' : 'DELETE' })
  return isRecord(body) && typeof body.followers === 'number' ? { followed: body.followed === true, followers: body.followers } : null
}

/* ---------------- Links ---------------- */

/** Query parameter of a shared profile link (`/?u=handle`). */
export const PROFILE_PARAM = 'u'

/** The shareable link to a profile: the game opens straight on it, crediting whoever shares it when that's someone else (`?ref=`). */
export const profileUrl = (handle: string) => {
  const own = accountHandle()
  const ref = own && own !== handle ? `&${REF_PARAM}=${encodeURIComponent(own)}` : ''
  return `${location.origin}${ROUTES.play[locale()]}?${PROFILE_PARAM}=${encodeURIComponent(handle)}${ref}`
}

/**
 * The game's link for a share card or its text, crediting `handle` (`?ref=`)
 * when the player has one. Always the public site, so a card shared from a
 * preview build still sends people to the game.
 */
export const gameUrl = (handle: string | null) => `${SITE_URL}${ROUTES.play[locale()]}${handle ? `?${REF_PARAM}=${encodeURIComponent(handle)}` : ''}`

/* ---------------- Invites ---------------- */

/** The friends who signed up with the player's link (`InvitedFriend[]`), or null offline or signed out. */
export const fetchInvites = async () => {
  const token = await sessionToken()
  if (!token) return null
  return parseInvites((await read('/invites', token)).body)
}

const inviters = new Map<string, Promise<string | null>>()

/**
 * The display name of the device's inviter (`storedRef`), for the title's
 * invite banner: asked once per page, null offline or when nobody has that handle.
 */
export const inviterName = (): Promise<string | null> => {
  const ref = storedRef()
  if (!ref || !rankingEnabled) return Promise.resolve(null)
  let name = inviters.get(ref)
  if (!name) inviters.set(ref, (name = fetchProfile(ref).then((p) => (p && p !== 'missing' ? p.name : null))))
  return name
}

/** Dev: lands as if invited by `handle` (shown as `name`), without asking the API. */
export const stageInvite = (handle: string, name: string = handle) => {
  storeRef(handle)
  inviters.set(handle, Promise.resolve(name))
}

/**
 * On boot: a link with `?ref=` (or a profile's `?u=`) keeps its handle as the
 * device's inviter, first touch only and never the player's own, and counts
 * the landing when it's news to this device. `?ref=` stays in the address bar:
 * a friend who opened the link inside an app (X, Instagram) and moves to the
 * browser to sign in with Google still brings it along.
 */
export const captureRef = () => {
  const params = new URLSearchParams(location.search)
  const landed = landingRef(params, PROFILE_PARAM)
  if (!landed) return
  const own = accountHandle()
  const stored = storedRef()
  const keep = firstTouch(stored, landed, own)
  if (keep !== stored && keep !== null) storeRef(keep)
  if (landed !== own && landed !== stored) track('ref_land', { ref: landed, via: params.has(REF_PARAM) ? 'ref' : 'profile', first: stored === null ? 1 : 0 })
}
