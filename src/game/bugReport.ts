import { isRecord, wholeNumber } from './parse'

/**
 * A bug report (Ajustes → Sobre, the pause menu, or the prompt after the game
 * closed mid-run): what the player wrote and, unless they turned it off, the
 * technical info the game gathered (`src/bugReport.ts`). The API posts it to
 * the community Discord's #bug-reports (`server/src/bugReports.ts`). Pure;
 * shared with the API, which trusts nothing the parser doesn't rebuild.
 */

/** Lengths in characters (code points), how many errors ride along, and how many reports an IP or an account sends per hour. */
export const BUG_REPORT = { text: { min: 5, max: 1000 }, errors: 5, message: 300, stack: 1200, field: 200, perHour: 5 } as const

/** An uncaught error or unhandled rejection the game caught (`window` `error` / `unhandledrejection`). */
export type BugError = {
  kind: 'error' | 'rejection'
  message: string
  /** `file:line:col`, when the browser said. */
  source: string
  stack: string
  /** ISO time it happened. */
  at: string
}

/** The run on screen, as plain numbers and ids: never the save. */
export type BugRun = {
  partner: string
  /** The stage (or Mega) it's in now. */
  form: string
  difficulty: string
  /** Seconds survived. */
  time: number
  level: number
  phase: string
  biome: string
  /** Wild Pokémon on the field, a hint for crashes under load. */
  enemies: number
}

/** The run the game was in when the page died last time, as the crash watch last saw it. */
export type BugCrash = {
  /** When the watch last wrote it (ISO). */
  at: string
  version: string
  run: BugRun | null
  /** JS heap in MB then (Chrome only). */
  heapMb: number | null
  /** The last error of that session, if any. */
  error: BugError | null
}

/** Everything a report carries besides the player's words. */
export type BugTech = {
  /** The build (`__GAME_VERSION__`, a commit). */
  version: string
  locale: string
  userAgent: string
  /** `412x915` (CSS px). */
  screen: string
  viewport: string
  dpr: number
  /** `navigator.deviceMemory` (GB) and `hardwareConcurrency`, where the browser says. */
  memory: number | null
  cores: number | null
  heapMb: number | null
  /** Installed as an app (PWA). */
  standalone: boolean
  touch: boolean
  /** Seconds since the page loaded. */
  uptime: number
  /** The screen on top (`settings-screen`, `pause`…). */
  view: string
  run: BugRun | null
  /** Newest last. */
  errors: BugError[]
  crash: BugCrash | null
}

export type BugReport = { text: string; tech: BugTech | null }

const length = (s: string) => [...s].length

/** The first `max` characters (code points), so a cut never splits an emoji. */
export const clip = (s: string, max: number) => (length(s) > max ? [...s].slice(0, max - 1).join('') + '…' : s)

// Control and invisible formatting characters (zero-width, bidi overrides). Whitespace ones are handled apart.
const INVISIBLE = /(?!\s)[\p{Cc}\p{Cf}]/gu

/** A line of technical text: no control characters, clipped. Anything not a string reads as empty. */
const line = (v: unknown, max: number = BUG_REPORT.field) => (typeof v === 'string' ? clip(v.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim(), max) : '')

/** A stack: its lines kept, clipped. */
const block = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(INVISIBLE, '').replace(/\r\n?/g, '\n').trim(), max) : '')

/** A finite number in `min..max`, rounded to 2 decimals, else null. */
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v * 100) / 100 : null)

const parseError = (v: unknown): BugError | null => {
  if (!isRecord(v)) return null
  const message = line(v.message, BUG_REPORT.message)
  if (!message) return null
  return { kind: v.kind === 'rejection' ? 'rejection' : 'error', message, source: line(v.source), stack: block(v.stack, BUG_REPORT.stack), at: line(v.at, 40) }
}

const parseRun = (v: unknown): BugRun | null =>
  isRecord(v)
    ? {
        partner: line(v.partner, 40),
        form: line(v.form, 40),
        difficulty: line(v.difficulty, 20),
        time: wholeNumber(v.time, 24 * 3600),
        level: wholeNumber(v.level, 999),
        phase: line(v.phase, 20),
        biome: line(v.biome, 20),
        enemies: wholeNumber(v.enemies, 100_000),
      }
    : null

/** The crashed run, from the API's body or the crash watch in localStorage. */
export const parseBugCrash = (v: unknown): BugCrash | null =>
  isRecord(v) ? { at: line(v.at, 40), version: line(v.version, 40), run: parseRun(v.run), heapMb: num(v.heapMb, 0, 1e6), error: parseError(v.error) } : null

/** The technical info, rebuilt field by field: unknown fields are dropped, strings clipped, odd numbers null. */
export const parseBugTech = (v: unknown): BugTech | null => {
  if (!isRecord(v)) return null
  return {
    version: line(v.version, 40),
    locale: line(v.locale, 10),
    userAgent: line(v.userAgent, 400),
    screen: line(v.screen, 20),
    viewport: line(v.viewport, 20),
    dpr: num(v.dpr, 0, 16) ?? 1,
    memory: num(v.memory, 0, 1024),
    cores: num(v.cores, 0, 1024),
    heapMb: num(v.heapMb, 0, 1e6),
    standalone: v.standalone === true,
    touch: v.touch === true,
    uptime: wholeNumber(v.uptime, 1e9),
    view: line(v.view, 60),
    run: parseRun(v.run),
    errors: (Array.isArray(v.errors) ? v.errors : []).slice(-BUG_REPORT.errors).map(parseError).filter((e): e is BugError => e !== null),
    crash: parseBugCrash(v.crash),
  }
}

/** What the player wrote: whitespace tidied, at most one blank line in a row, no invisible characters. */
export const cleanBugText = (v: string) =>
  v
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** A report from the game: `{ text, tech? }`. Null when the text is too short or too long; a `tech` that isn't an object is dropped. */
export const parseBugReport = (v: unknown): BugReport | null => {
  if (!isRecord(v) || typeof v.text !== 'string') return null
  const text = cleanBugText(v.text)
  if (length(text) < BUG_REPORT.text.min || length(text) > BUG_REPORT.text.max) return null
  return { text, tech: parseBugTech(v.tech) }
}
