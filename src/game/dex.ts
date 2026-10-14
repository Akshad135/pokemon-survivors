/**
 * Pokédex progress: per species (national dex number), whether the player has
 * seen it, how many they defeated, and whether they caught it (and shiny).
 * Everything here is pure; the simulation fills a run's `DexLog` and the shell
 * folds it into the save (`ui/save.ts`).
 */

/** Bit flags of a species' mark. Seen is implied by the mark existing. */
export const DEX_FLAGS = { caught: 1, shiny: 2 } as const

/** One species in the save, compact for hundreds of entries: `[defeated, flags]`. */
export type DexMark = readonly [defeated: number, flags: number]

/** Saved progress, keyed by national dex number. Missing species were never seen. */
export type Pokedex = Readonly<Record<number, DexMark>>

export const EMPTY_DEX: Pokedex = {}

export type DexStatus = { seen: boolean; defeated: number; caught: boolean; shiny: boolean }

const ALL_FLAGS = DEX_FLAGS.caught | DEX_FLAGS.shiny

/** What the Pokédex knows about one species. */
export const dexStatus = (dex: Pokedex, n: number): DexStatus => {
  const mark = dex[n]
  if (!mark) return { seen: false, defeated: 0, caught: false, shiny: false }
  const [defeated, flags] = mark
  return { seen: true, defeated, caught: (flags & DEX_FLAGS.caught) !== 0, shiny: (flags & DEX_FLAGS.shiny) !== 0 }
}

const update = (dex: Pokedex, n: number, defeated: number, flags: number): Pokedex => {
  const [d, f] = dex[n] ?? [0, 0]
  return { ...dex, [n]: [d + defeated, f | flags] }
}

export const markSeen = (dex: Pokedex, n: number) => update(dex, n, 0, 0)

export const markDefeated = (dex: Pokedex, n: number, count = 1) => update(dex, n, Math.max(0, count), 0)

/**
 * Registers a species as the player's own (and seen): a defeated shiny, a
 * hatched egg, or a form the player played (`DexLog.own`).
 */
export const markCaught = (dex: Pokedex, n: number, shiny = false) => update(dex, n, 0, DEX_FLAGS.caught | (shiny ? DEX_FLAGS.shiny : 0))

export type DexCounts = { seen: number; defeated: number; caught: number; shiny: number }

/**
 * Species seen, defeated at least once, caught and caught shiny. `among`
 * limits the count to the species the game still has (the in-game Pokédex
 * passes its list); without it every saved mark counts.
 */
export const dexCounts = (dex: Pokedex, among?: readonly number[]): DexCounts => {
  const marks = among ? among.flatMap((n) => (dex[n] ? [dex[n]] : [])) : Object.values(dex)
  return marks.reduce<DexCounts>(
    (c, [defeated, flags]) => ({
      seen: c.seen + 1,
      defeated: c.defeated + (defeated > 0 ? 1 : 0),
      caught: c.caught + (flags & DEX_FLAGS.caught ? 1 : 0),
      shiny: c.shiny + (flags & DEX_FLAGS.shiny ? 1 : 0),
    }),
    { seen: 0, defeated: 0, caught: 0, shiny: 0 },
  )
}

/**
 * A hatched egg: the form that came out (`line[0]`) is caught, shiny if it
 * hatched shiny, and the whole evolution line counts as seen.
 */
export const markHatch = (dex: Pokedex, line: readonly number[], shiny: boolean): Pokedex => {
  const seen = line.reduce(markSeen, dex)
  const [first] = line
  return first === undefined ? seen : markCaught(seen, first, shiny)
}

/* ---------------- One run ---------------- */

/**
 * What a run added, filled by the simulation as it goes. `shinies` are the
 * species caught by defeating a shiny; `own` the forms the player played
 * (the starter and what it evolved into), each caught, shiny if the run was.
 */
export type DexLog = { seen: Set<number>; defeated: Map<number, number>; shinies: Set<number>; own: Map<number, boolean> }

export const createDexLog = (): DexLog => ({ seen: new Set(), defeated: new Map(), shinies: new Set(), own: new Map() })

export const logDefeat = (log: DexLog, n: number, shiny: boolean) => {
  log.seen.add(n)
  log.defeated.set(n, (log.defeated.get(n) ?? 0) + 1)
  if (shiny) log.shinies.add(n)
}

/**
 * `dex` with a run's log folded in. The shell always folds into the save the
 * run started from, so banking the same run twice (victory, then endless) is safe.
 */
export const recordRun = (dex: Pokedex, log: DexLog): Pokedex => {
  const withSeen = [...log.seen].reduce(markSeen, dex)
  const withDefeats = [...log.defeated].reduce((d, [n, count]) => markDefeated(d, n, count), withSeen)
  const withOwn = [...log.own].reduce((d, [n, shiny]) => markCaught(d, n, shiny), withDefeats)
  return [...log.shinies].reduce((d, n) => markCaught(d, n, true), withOwn)
}

/** End-of-run summary: species seen for the first time and shinies caught that weren't before. */
export const dexNews = (dex: Pokedex, log: DexLog) => ({
  species: [...log.seen].filter((n) => !dex[n]).length,
  shinies: [...log.shinies].filter((n) => !dexStatus(dex, n).shiny).length,
})

/* ---------------- Save ---------------- */

/** Both Pokédexes in one: every species either saw, the most defeated, and caught (or shiny) if either caught it. */
export const mergeDex = (a: Pokedex, b: Pokedex): Pokedex =>
  Object.entries(b).reduce<Pokedex>((dex, [key, [defeated, flags]]) => {
    const [d, f] = dex[Number(key)] ?? [0, 0]
    return { ...dex, [key]: [Math.max(d, defeated), f | flags] }
  }, a)

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0)

/**
 * Parses the saved Pokédex entry by entry: bad dex numbers or malformed marks
 * are dropped, counts are clamped and unknown flag bits cleared. Never throws.
 */
export const parseDex = (raw: unknown): Pokedex => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_DEX
  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, mark]): Array<[number, DexMark]> => {
      const n = Number(key)
      if (!Number.isInteger(n) || n <= 0 || !Array.isArray(mark)) return []
      return [[n, [count(mark[0]), count(mark[1]) & ALL_FLAGS]]]
    }),
  )
}
