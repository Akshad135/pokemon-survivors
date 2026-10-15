/** Seeded PRNG (mulberry32). Returns floats in [0, 1). */
export type Rng = () => number

export const createRng = (seed: number): Rng => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const range = (rng: Rng, min: number, max: number) => min + rng() * (max - min)

export const chance = (rng: Rng, p: number) => rng() < p

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!

export const weightedPick = <T>(rng: Rng, entries: ReadonlyArray<readonly [T, number]>): T => {
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = rng() * total
  for (const [item, weight] of entries) {
    roll -= weight
    if (roll <= 0) return item
  }
  return entries[entries.length - 1]![0]
}

/** Stateless integer hash → [0, 1). Used for deterministic world generation. */
export const hash2 = (x: number, y: number, seed = 0) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** FNV-1a: a stable 32-bit seed from text (a date, a period key), for draws everyone gets the same. */
export const seedFrom = (text: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return h >>> 0
}
