import type { TitleId } from '../data/achievements'
import type { EnemyId } from '../data/enemies'
import { dailyChallenge, type Attempt } from '../game/challenge'
import { brasiliaDay, isDayKey } from '../game/day'
import { isRecord } from '../game/parse'
import { counterOf } from '../game/mart'
import { outbreakAt } from '../game/outbreak'
import { depositEggs, type Egg } from '../game/eggs'
import { parseSave, recordHatch, recordRun, type Save } from '../game/meta'
import type { RunSummary } from '../game/tally'
import { STICK_MODES, type StickMode } from '../engine/input'
import { DAMAGE_NUMBERS, type DamageNumbers } from '../render/damageNumbers'
import { DEFAULT_BINDINGS, parseBindings, type Bindings } from '../engine/bindings'

const KEY = 'ps:save'

/** Reads the meta save. Storage errors (private mode, quota) fall back to an empty save. */
export const loadSave = (): Save => {
  try {
    return parseSave(localStorage.getItem(KEY))
  } catch {
    return parseSave(null)
  }
}

export const writeSave = (save: Save) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    // Storage full or blocked: progress just won't persist this session.
  }
}

/** Applies `change` to the stored save and writes it back. */
export const updateSave = (change: (save: Save) => Save) => writeSave(change(loadSave()))

/** Adds run earnings to the wallet and returns the new balance. */
export const depositPokeDollars = (amount: number) => {
  const save = loadSave()
  const next = { ...save, wallet: save.wallet + Math.max(0, Math.round(amount)) }
  writeSave(next)
  return next.wallet
}

/**
 * Banks a run into the incubator: incubating eggs walk `steps`, new eggs take
 * the free slots and the rest are paid in ₽ (see `depositEggs`).
 */
export const bankEggs = (steps: number, found: readonly Egg[]) => {
  const { save, converted, refund } = depositEggs(loadSave(), steps, found)
  writeSave(save)
  return { converted, refund }
}

/* ---------------- Missions and achievements ---------------- */

/** Dev-only shift of the missions' clock (`ps.date`), in ms. */
let clockOffset = 0

/** The date missions are drawn for: the local clock, unless the dev console moved it. */
export const today = () => new Date(Date.now() + clockOffset)

export const setToday = (date: Date | null) => {
  clockOffset = date ? date.getTime() - Date.now() : 0
}

/** Dev-only outbreak held instead of the day's (`ps.outbreak`). */
let outbreakOverride: EnemyId | null = null

/** The outbreak of the day (Brasília) on the missions' clock, unless the dev console holds another. */
export const outbreakToday = (): EnemyId => outbreakOverride ?? outbreakAt(today())

export const setOutbreak = (id: EnemyId | null) => {
  outbreakOverride = id
}

/** Today's Desafio do dia (Brasília day, on the missions' clock). */
export const challengeToday = () => dailyChallenge(brasiliaDay(today()))

const ATTEMPT_KEY = 'ps:challenge'

/**
 * The last official challenge attempt this device finished (`Attempt`),
 * kept apart from the save: it's only a hint for the challenge screen, the
 * API keeps the real one for an account (`nextIsOfficial`).
 */
export const loadAttempt = (): Attempt | null => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(ATTEMPT_KEY) ?? 'null')
    return isRecord(data) && isDayKey(data.day) && typeof data.time === 'number' ? { day: data.day, time: data.time } : null
  } catch {
    return null
  }
}

export const saveAttempt = (attempt: Attempt | null) => {
  try {
    if (attempt) localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt))
    else localStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // Storage blocked: the screen just can't tell practice apart this session.
  }
}

/** Today's Poké Mart counter (Brasília day, on the missions' clock). */
export const counterToday = () => counterOf(brasiliaDay(today()))

/**
 * Records a run into the missions and achievements, pays their rewards and saves.
 * `before` is the snapshot already recorded for this run and `eggRoom` the
 * reward eggs it can still take (see `recordRun`).
 */
export const recordRunProgress = (summary: RunSummary, before: RunSummary | null, eggRoom: number) => {
  const record = recordRun(loadSave(), summary, before, today(), eggRoom)
  writeSave(record.save)
  return record
}

/** Saves a hatched egg (`hatchEgg`'s save) with what it did for the missions and achievements. */
export const saveHatch = (save: Save, shiny: boolean) => {
  const record = recordHatch(save, shiny, today())
  writeSave(record.save)
  return record
}

/** Shows `title` on the title and results screens (null hides it). */
export const equipTitle = (title: TitleId | null) => writeSave({ ...loadSave(), title })

/* ---------------- Settings ---------------- */

const SETTINGS_KEY = 'ps:settings'
/** Mute flag from before the settings screen existed. */
const LEGACY_MUTE_KEY = 'ps:muted'

/** Player preferences. Language lives in `i18n` (`ps:lang`). Volumes go from 0 to 1. */
export type Settings = {
  musicVolume: number
  sfxVolume: number
  muted: boolean
  /** `reduced` keeps the biggest few on a crowded screen (`render/damageNumbers.ts`). */
  damageNumbers: DamageNumbers
  screenShake: boolean
  /** Remapped keys and gamepad buttons. Per device, so they stay out of the synced save. */
  controls: Bindings
  /** Touch joystick: follows the thumb (the default) or waits in the bottom-left corner. */
  joystick: StickMode
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.6,
  sfxVolume: 1,
  muted: false,
  damageNumbers: 'reduced',
  screenShake: true,
  controls: DEFAULT_BINDINGS,
  joystick: 'floating',
}

const volume = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback)
const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
/** The old on/off flag maps to `reduced` (on was the default, never a choice) or `off`. */
const damageMode = (v: unknown, fallback: DamageNumbers): DamageNumbers =>
  typeof v === 'boolean' ? (v ? 'reduced' : 'off') : (DAMAGE_NUMBERS.find((m) => m === v) ?? fallback)

/** Parses stored settings field by field: anything missing or malformed falls back to `defaults`. */
export const parseSettings = (raw: string | null, defaults = DEFAULT_SETTINGS): Settings => {
  let data: Partial<Record<keyof Settings, unknown>> = {}
  try {
    const parsed: unknown = raw === null ? null : JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) data = parsed
  } catch {
    // Corrupt JSON: start from the defaults.
  }
  return {
    musicVolume: volume(data.musicVolume, defaults.musicVolume),
    sfxVolume: volume(data.sfxVolume, defaults.sfxVolume),
    muted: flag(data.muted, defaults.muted),
    damageNumbers: damageMode(data.damageNumbers, defaults.damageNumbers),
    screenShake: flag(data.screenShake, defaults.screenShake),
    controls: parseBindings(data.controls),
    joystick: STICK_MODES.find((m) => m === data.joystick) ?? defaults.joystick,
  }
}

export const loadSettings = (): Settings => {
  try {
    const legacyMuted = localStorage.getItem(LEGACY_MUTE_KEY) === '1'
    return parseSettings(localStorage.getItem(SETTINGS_KEY), { ...DEFAULT_SETTINGS, muted: legacyMuted })
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const writeSettings = (settings: Settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage blocked: the settings just last this session.
  }
}
