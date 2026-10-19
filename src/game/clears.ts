import { PLAYABLE, PLAYABLE_IDS, type PlayableId } from '../data/hatchlings'
import { REGIONS } from '../data/starters'
import { DIFFICULTY_IDS, isDifficulty, type Difficulty } from './difficulty'
import type { Lifetime } from './achievements'
import { isRecord } from './parse'
import type { RunSummary } from './tally'

/**
 * Clears: the Pokémon that beat Mewtwo, each with the hardest difficulty it
 * did it on. The Pokédex and the partner select badge them, so players can
 * chase a clear with every partner.
 */
export type Clears = Partial<Record<PlayableId, Difficulty>>

const rank = (d: Difficulty) => DIFFICULTY_IDS.indexOf(d)

/** The harder of two difficulties (`b` when there's no `a`). */
const harder = (a: Difficulty | undefined, b: Difficulty): Difficulty => (a !== undefined && rank(a) >= rank(b) ? a : b)

const withClear = (clears: Clears, id: PlayableId, d: Difficulty): Clears => ({ ...clears, [id]: harder(clears[id], d) })

/** Adds a run's clear, if Mewtwo fell in it. */
export const addClear = (clears: Clears, s: Pick<RunSummary, 'starter' | 'difficulty' | 'victory'>): Clears =>
  s.victory ? withClear(clears, s.starter, s.difficulty) : clears

/** Two saves' clears in one: every Pokémon cleared on either side, at the harder difficulty. */
export const mergeClears = (a: Clears, b: Clears): Clears =>
  PLAYABLE_IDS.reduce((acc, id) => {
    const d = b[id]
    return d ? withClear(acc, id, d) : acc
  }, a)

/** Saved clears, keeping known Pokémon and difficulties only. */
export const parseClears = (raw: unknown): Clears =>
  isRecord(raw)
    ? Object.fromEntries(
        PLAYABLE_IDS.flatMap((id) => {
          const d = raw[id]
          return isDifficulty(d) ? [[id, d] as const] : []
        }),
      )
    : {}

/**
 * Clears a save from before they were tracked can prove from its records:
 * the regions and base types of the starters that won (`winGens`, `winTypes`).
 * Each region has one starter per type, so when either list has a single
 * entry, every pair is a starter that won. The difficulty isn't known: Normal.
 */
export const pastClears = (l: Lifetime): Clears => {
  if (l.winGens.length !== 1 && l.winTypes.length !== 1) return {}
  return Object.fromEntries(
    REGIONS.filter((r) => l.winGens.includes(r.gen))
      .flatMap((r) => r.starters)
      .filter((id) => l.winTypes.includes(PLAYABLE[id].line[0].types[0]!))
      .map((id) => [id, 'normal'] as const),
  )
}

/** How many Pokémon have a clear. */
export const clearCount = (clears: Clears) => Object.keys(clears).length
