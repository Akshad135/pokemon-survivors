import { accountState, API_URL } from './account'
import { apiCall } from './api'
import { BUG_REPORT, clip, parseBugCrash, type BugCrash, type BugError, type BugReport, type BugRun, type BugTech } from './game/bugReport'
import { isRecord } from './game/parse'
import { locale } from './i18n'

/**
 * What a bug report carries besides the player's words, gathered on the
 * device, and the report's side of the API. Imported first by `main.ts`, so
 * the error listeners are on before anything else runs:
 * - the last few uncaught errors and unhandled rejections, in memory;
 * - a crash watch: while a run is on, `ps:runWatch` in localStorage holds
 *   what it looks like (refreshed every few seconds) and the session's last
 *   error. A run that ends, or a page closed on purpose, clears it; a page the
 *   phone killed mid-run leaves it, and the next boot finds it (`takeCrash`).
 */

/** Whether reports can go anywhere: they need the API. */
export const bugReportsEnabled = Boolean(API_URL)

const WATCH_KEY = 'ps:runWatch'

/** How often the crash watch rewrites the run's state. */
const WATCH_MS = 5000

const errors: BugError[] = []

/** What the shell has on screen, set by `main.ts` (`describeWith`). */
type Context = { view: string; run: BugRun | null }

let describe = (): Context => ({ view: '', run: null })

/** The crash watch as stored: the run, the session's last error, and whether the page was in the background. */
type Watch = BugCrash & { hidden: boolean }

let watch: Watch | null = null

const readWatch = (): Watch | null => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(WATCH_KEY) ?? 'null')
    const crash = parseBugCrash(v)
    return crash && isRecord(v) ? { ...crash, hidden: v.hidden === true } : null
  } catch {
    return null
  }
}

const writeWatch = (next: Watch | null) => {
  watch = next
  try {
    if (next) localStorage.setItem(WATCH_KEY, JSON.stringify(next))
    else localStorage.removeItem(WATCH_KEY)
  } catch {
    // Private mode or a full storage: the watch is best effort.
  }
}

/** The JS heap in MB, where the browser says (Chrome). */
const heapMb = () => {
  const memory: unknown = Reflect.get(performance, 'memory')
  return isRecord(memory) && typeof memory.usedJSHeapSize === 'number' ? Math.round(memory.usedJSHeapSize / 1_048_576) : null
}

const numberOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Brings the crash watch up to date with the run on screen (`describeWith`):
 * written while one is on, cleared once it's over. `main.ts` calls it as a
 * run starts and ends; a timer keeps it fresh in between.
 */
export const syncRunWatch = () => {
  const { run } = describe()
  if (!run) return watch && writeWatch(null)
  writeWatch({ at: new Date().toISOString(), version: __GAME_VERSION__, run, heapMb: heapMb(), error: watch?.error ?? null, hidden: document.hidden })
}

const record = (e: BugError) => {
  errors.push(e)
  if (errors.length > BUG_REPORT.errors) errors.shift()
  if (watch) writeWatch({ ...watch, error: e })
}

window.addEventListener('error', (e) => {
  const error: unknown = e.error
  record({
    kind: 'error',
    message: clip(e.message || String(error), BUG_REPORT.message),
    source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : '',
    stack: error instanceof Error ? clip(error.stack ?? '', BUG_REPORT.stack) : '',
    at: new Date().toISOString(),
  })
})

window.addEventListener('unhandledrejection', (e) => {
  const reason: unknown = e.reason
  record({
    kind: 'rejection',
    message: clip(reason instanceof Error ? reason.message : String(reason), BUG_REPORT.message),
    source: '',
    stack: reason instanceof Error ? clip(reason.stack ?? '', BUG_REPORT.stack) : '',
    at: new Date().toISOString(),
  })
})

// The game pauses in the background, where the phone may close the tab to free memory: that's not a crash.
document.addEventListener('visibilitychange', syncRunWatch)

// Closing or reloading on purpose isn't a crash either, unless an error came first (a frozen game reloaded).
window.addEventListener('pagehide', () => watch && !watch.error && writeWatch(null))

// Back from the back/forward cache, the run is still there.
window.addEventListener('pageshow', (e) => e.persisted && syncRunWatch())

setInterval(syncRunWatch, WATCH_MS)

/**
 * The run the page died in last time, once: the watch is cleared as it's
 * read. Null when the last session ended cleanly, or the page was in the
 * background without an error (the phone freeing memory).
 */
export const takeCrash = (): BugCrash | null => {
  const found = readWatch()
  if (!found) return null
  writeWatch(null)
  const { hidden, ...crash } = found
  return hidden && !crash.error ? null : crash
}

/** Tells the reports what's on screen: `main.ts` hands in the run (plain numbers and ids) and the top screen's name. */
export const describeWith = (fn: () => Context) => {
  describe = fn
}

/** `412x915`. */
const size = (w: number, h: number) => `${Math.round(w)}x${Math.round(h)}`

/** The technical info right now, with the crashed run when the report is about one. */
export const techInfo = (crash: BugCrash | null): BugTech => {
  const { view, run } = describe()
  return {
    version: __GAME_VERSION__,
    locale: locale(),
    userAgent: navigator.userAgent,
    screen: size(screen.width, screen.height),
    viewport: size(window.innerWidth, window.innerHeight),
    dpr: window.devicePixelRatio,
    memory: numberOf(Reflect.get(navigator, 'deviceMemory')),
    cores: numberOf(navigator.hardwareConcurrency),
    heapMb: heapMb(),
    standalone: matchMedia('(display-mode: standalone)').matches,
    touch: navigator.maxTouchPoints > 0,
    uptime: Math.round(performance.now() / 1000),
    view,
    run,
    errors: [...errors],
    crash,
  }
}

/** What sending came to: sent, too many lately, or the API out of reach. */
export type BugSent = 'sent' | 'limit' | 'invalid' | 'offline'

/** Sends a report, with the player's token when signed in (the thread then shows their handle). */
export const sendBugReport = async (report: BugReport): Promise<BugSent> => {
  const { status } = await apiCall('/bug-reports', { method: 'POST', body: report, auth: accountState().kind === 'signedIn' })
  if (status === 201) return 'sent'
  if (status === 429) return 'limit'
  if (status === 400) return 'invalid'
  return 'offline'
}
