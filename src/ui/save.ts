import { parseSave, type Save } from '../game/meta'

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

/** Adds run earnings to the wallet and returns the new balance. */
export const depositPokeDollars = (amount: number) => {
  const save = loadSave()
  const next = { ...save, wallet: save.wallet + Math.max(0, Math.round(amount)) }
  writeSave(next)
  return next.wallet
}
