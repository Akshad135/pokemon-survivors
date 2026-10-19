import type { StatDelta } from '../game/stats'

/**
 * Cursed items: strong held items with a price, found only in locked chests
 * (`game/curses.ts` rolls them and runs their downsides). They don't take a
 * held item slot and never level up. `stats` is the upside, added in
 * `recomputeStats`; the downside lives in the rules (Life Orb's recoil, Choice
 * Band's lock, Flame Orb's burn) or in the stats too (Iron Ball's speed).
 */
export type CurseDef = {
  /** Official English name; descriptions live in `i18n` (`curses`). */
  name: string
  stats: StatDelta
}

export const CURSES = {
  /** Each cast costs HP (`CURSE.lifeOrb`). */
  lifeOrb: { name: 'Life Orb', stats: { might: 0.3 } },
  /** No new moves from level-ups: only upgrades (`blocksNewMoves`). */
  choiceBand: { name: 'Choice Band', stats: { might: 0.4 } },
  /** Burned for the rest of the run: HP drains over time (`CURSE.flameOrb`), Guts-style power. */
  flameOrb: { name: 'Flame Orb', stats: { might: 0.25, statusChance: 0.1 } },
  /** Heavy: slower on foot, harder hits. */
  ironBall: { name: 'Iron Ball', stats: { might: 0.3, armor: 1, speed: -13 } },
} as const satisfies Record<string, CurseDef>

export type CurseId = keyof typeof CURSES

export const CURSE_IDS = Object.keys(CURSES) as CurseId[]
