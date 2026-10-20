import type { PostHog } from 'posthog-js'
import type { AbilityId, HitKind } from './data/abilities'
import type { BranchId } from './data/branches'
import type { EnemyId } from './data/enemies'
import type { PlayableId } from './data/hatchlings'
import type { MegaId } from './data/megas'
import type { Difficulty } from './game/difficulty'
import type { LobbyFocus } from './ui/title'

/**
 * Analytics and error reports. Events go to PostHog (product analytics and
 * error tracking, through our `/ingest` proxy) and, while we compare the two,
 * to our self-hosted Umami. PostHog loads after the game is up, so play never
 * waits on it; events and errors from before it loads wait in a short queue.
 * Only production domains report (or a device with `ps:analytics` set to `on`, for testing).
 */

/** Custom events, with their payloads. Keep this list short: every event counts against the free tier. */
type AnalyticsEvents = {
  run_start: { starter: PlayableId; difficulty: Difficulty; challenge?: 'official' | 'practice' }
  /** How a run ended, with what it was built from: the build and the cause of a faint are what tuning needs. */
  run_end: {
    starter: PlayableId
    difficulty: Difficulty
    outcome: 'victory' | 'gameover' | 'endless' | 'quit'
    minute: number
    level: number
    kills: number
    stage: number
    branch: BranchId | null
    ability: AbilityId | null
    /** The Mega Stone found, and how many times the run Mega Evolved. */
    mega: MegaId | null
    megas: number
    /** `id:level` of each move and held item at the end. */
    moves: string[]
    items: string[]
    bosses: number
    /** What landed the last hit of a faint: the foe's species (null for a hazard) and the kind of hit. */
    foe: EnemyId | null
    hit: HitKind | null
    challenge?: 'official' | 'practice'
    /** A haunted run's (Noite das Bruxas) candies, to tune the candy jar. */
    candies?: number
  }
  /** An entry pressed in the lobby: what players open. */
  lobby_press: { entry: LobbyFocus }
  /** A share card left the game (the run's or the Trainer Card), or the invite link, through the share sheet, the clipboard or a download. */
  share: { kind: 'run' | 'trainer' | 'invite'; method: 'share' | 'copy' | 'download' }
  /** The game opened from a link carrying a handle this device didn't hold (`?ref=` or a profile's `?u=`); `first`: the device had no inviter yet. */
  ref_land: { ref: string; via: 'ref' | 'profile'; first: 0 | 1 }
  /** A new account signed up with an invite and the API counted it (`POST /referral`). */
  ref_signup: { ref: string }
  /**
   * Installing the app (`ui/install.ts`): Chromium's prompt shown from Settings (`prompt`) and the
   * answer (`accepted`, `dismissed`), the iOS how-to opened (`ios`), and any install at all,
   * from our button or the browser's menu (`installed`).
   */
  install: { step: 'prompt' | 'accepted' | 'dismissed' | 'ios' | 'installed' }
}

declare global {
  interface Window {
    /** Umami's tracker, set by the script in the page head. Missing in dev, offline or behind an ad blocker. */
    umami?: { track: (event: string, data?: Record<string, string | number>) => void }
  }
}

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const LIVE_HOSTS = ['www.pokemonsurvivors.com', 'www.pokemonsurvivors.com.br']
/** Errors one page load reports at most: a bug in the game loop throws every frame. */
const MAX_ERRORS = 20
/** Longest replay attached to an error report, in characters; PostHog drops events past 1 MB. */
const MAX_REPLAY = 400_000

let posthog: PostHog | null = null
/** Calls waiting for PostHog to load; null once it won't (not a live domain, failed to load). */
let pending: ((ph: PostHog) => void)[] | null = []

const withPosthog = (fn: (ph: PostHog) => void) => {
  if (posthog) return fn(posthog)
  if (pending && pending.length < 100) pending.push(fn)
}

/** Umami takes flat data only. */
const flat = (data: object) => Object.fromEntries(Object.entries(data).filter((e): e is [string, string | number] => typeof e[1] === 'string' || typeof e[1] === 'number'))

/** Sends a custom event. Silently does nothing where analytics don't run. */
export const track = <E extends keyof AnalyticsEvents>(event: E, data: AnalyticsEvents[E]) => {
  window.umami?.track(event, flat(data))
  withPosthog((ph) => ph.capture(event, data))
}

let identity: { userId: string | null; handle: string | null } | null = null

/**
 * Ties this device's events to an account (its Clerk user id and public handle),
 * or back to a fresh anonymous id after signing out. Each call can cost an event,
 * so a device already tied to the account only sends a handle picked since the page loaded.
 */
export const identify = (userId: string | null, handle: string | null) => {
  const before = identity
  if (before?.userId === userId && before.handle === handle) return
  identity = { userId, handle }
  withPosthog((ph) => {
    if (!userId) return void (ph.get_property('$user_state') === 'identified' && ph.reset())
    if (ph.get_distinct_id() !== userId) ph.identify(userId, handle ? { handle } : undefined)
    else if (handle && before?.userId === userId) ph.setPersonProperties({ handle })
  })
}

/** What an error report carries besides the error: where the player was, and the run's replay (see `game/replay.ts`). */
export type ErrorContext = { [key: string]: string | number | boolean | null }

const reported = new Set<string>()

/** Reports an error once per message and place, up to `MAX_ERRORS` per page load. */
const reportError = (error: unknown, context: () => ErrorContext) => {
  const key = error instanceof Error ? `${error.message}\n${error.stack?.split('\n')[1] ?? ''}` : String(error)
  if (reported.has(key) || reported.size >= MAX_ERRORS) return
  reported.add(key)
  let props: ErrorContext = {}
  try {
    props = context()
  } catch {}
  if (typeof props.replay === 'string' && props.replay.length > MAX_REPLAY) props.replay = null
  withPosthog((ph) => ph.captureException(error, props))
}

const live = () => {
  if (!POSTHOG_KEY) return false
  if (LIVE_HOSTS.includes(location.hostname)) return true
  try {
    return localStorage.getItem('ps:analytics') === 'on'
  } catch {
    return false
  }
}

/**
 * Starts reporting: catches uncaught errors and rejections right away (with
 * `context`, read when one happens) and loads PostHog once the browser is idle.
 * Call once, first thing at boot.
 */
export const startAnalytics = (context: () => ErrorContext) => {
  const key = POSTHOG_KEY
  if (!key || !live()) return void (pending = null)
  // "Script error." comes from other origins (extensions) with nothing to go on.
  addEventListener('error', (e) => e.error && reportError(e.error, context))
  addEventListener('unhandledrejection', (e) => reportError(e.reason, context))
  const load = () =>
    import('posthog-js')
      .then(({ default: ph }) => {
        ph.init(key, {
          api_host: '/ingest',
          ui_host: 'https://us.posthog.com',
          persistence: 'localStorage',
          persistence_name: 'ps',
          // The game is a canvas: clicks, scrolls and replays of the DOM say little and cost events.
          autocapture: false,
          capture_pageleave: false,
          capture_dead_clicks: false,
          capture_performance: false,
          disable_session_recording: true,
          disable_surveys: true,
          // No feature flags, and so no remote config: its `/array/<key>/config` would get Vercel's trailing slash and a 404.
          advanced_disable_flags: true,
          // Our listeners above report errors, with the run's context.
          capture_exceptions: false,
        })
        ph.register({ version: __GAME_VERSION__ })
        posthog = ph
        pending?.forEach((fn) => fn(ph))
        pending = null
      })
      .catch(() => void (pending = null))
  if ('requestIdleCallback' in window) requestIdleCallback(() => void load(), { timeout: 4000 })
  else setTimeout(() => void load(), 2000)
}
