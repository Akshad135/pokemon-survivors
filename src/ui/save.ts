import type { TitleId } from '../data/achievements'
import { depositEggs, type Egg } from '../game/eggs'
import { parseSave, recordRun, type Save } from '../game/meta'
import type { RunSummary } from '../game/tally'

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

/**
 * Records a run into the missions and achievements, pays their ₽ and saves.
 * `before` is the snapshot already recorded for this run (see `recordRun`).
 */
export const recordRunProgress = (summary: RunSummary, before: RunSummary | null) => {
  const record = recordRun(loadSave(), summary, before, today())
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
  damageNumbers: boolean
  screenShake: boolean
}

export const DEFAULT_SETTINGS: Settings = { musicVolume: 0.6, sfxVolume: 1, muted: false, damageNumbers: true, screenShake: true }

const volume = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback)
const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

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
    damageNumbers: flag(data.damageNumbers, defaults.damageNumbers),
    screenShake: flag(data.screenShake, defaults.screenShake),
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
