/** Small guards for parsing untrusted save data. */

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** A finite number floored and clamped to 0..max, else 0. */
export const wholeNumber = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0

/** The entries of an array that belong to `allowed`, without duplicates. */
export const knownIds = <T extends string | number>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? allowed.filter((id) => v.includes(id)) : []
