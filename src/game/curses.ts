import type { Rng } from '../engine/rng'
import { CURSE_IDS, type CurseId } from '../data/curses'

/**
 * Cursed items (`data/curses.ts`): a locked chest sometimes holds one, and the
 * player takes it or leaves it (`Offer` kind `curse`, picked like a level-up).
 * The pure rules live here, tested in `curses.test.ts`; `curseSystem.ts` runs
 * them on the game.
 */

export const CURSE = {
  /** Chance an opened chest holds a cursed item, from this run time (s) on. */
  chance: 0.5,
  from: 90,
  /** Most cursed items held at once. */
  max: 2,
  /** Life Orb: share of max HP each cast costs, at most once every `gap` seconds. */
  lifeOrb: { cost: 0.01, gap: 1 },
  /** Flame Orb: share of max HP the burn takes per second, ticking every `tick` seconds. */
  flameOrb: { perSecond: 0.007, tick: 0.5 },
} as const

/** What a run holds: the cursed items taken, and when Life Orb and Flame Orb next bite. */
export type CurseState = { held: CurseId[]; recoilAt: number; burnAt: number }

export const createCurseState = (): CurseState => ({ held: [], recoilAt: 0, burnAt: 0 })

/**
 * The cursed item an opened chest holds, if any: one roll for the chance, one
 * for which (among those not held). None before `CURSE.from` or at the cap.
 */
export const chestCurse = (held: readonly CurseId[], time: number, rng: Rng): CurseId | null => {
  if (time < CURSE.from || held.length >= CURSE.max) return null
  if (rng() >= CURSE.chance) return null
  const left = CURSE_IDS.filter((id) => !held.includes(id))
  if (left.length === 0) return null
  return left[Math.floor(rng() * left.length)] ?? null
}

/** Choice Band: level-ups offer no new moves, only upgrades (and items). */
export const blocksNewMoves = (held: readonly CurseId[] | undefined) => held?.includes('choiceBand') ?? false

/**
 * HP after a cursed item takes `share` of max HP. Cursed items wear the player
 * down but never make them faint: they stop at 1 HP.
 */
export const curseDrain = (hp: number, maxHp: number, share: number) => Math.min(hp, Math.max(1, hp - maxHp * share))
