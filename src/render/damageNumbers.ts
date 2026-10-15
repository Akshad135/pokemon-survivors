import type { FloatText } from '../game/types'

/**
 * Which damage numbers get drawn, per the settings (`all`, `reduced`, `off`).
 * Presentation only: the simulation keeps every number, the filter runs at draw
 * time. `reduced` keeps the `keep` biggest totals and drops the rest, so a late
 * horde under area moves shows the hits that matter instead of a carpet of digits.
 */
export const DAMAGE_NUMBERS = ['all', 'reduced', 'off'] as const
export type DamageNumbers = (typeof DAMAGE_NUMBERS)[number]

export const REDUCED = {
  /** Numbers drawn at once, the biggest first. Numbers on the boss come on top of these. */
  keep: 8,
  /** Seconds a number shows (the simulation keeps them 0.7 s). */
  life: 0.5,
} as const

/** The smallest amount that still shows, and how many numbers of exactly that amount fit in. */
export type DamageBudget = { floor: number; ties: number }

const top = new Float64Array(REDUCED.keep)

/**
 * The `keep` biggest amounts among the showing damage numbers not on `bossId`, as a
 * floor plus the slots left for ties, so identical hits on a horde can't all
 * squeeze in. `floor` is -Infinity when everything fits. No allocation past the budget.
 */
export const damageBudget = (texts: readonly FloatText[], bossId: number | null, keep: number = REDUCED.keep): DamageBudget => {
  let n = 0
  for (const t of texts) {
    if (!t.damage || t.target === bossId || t.life >= REDUCED.life) continue
    // Insertion into the descending top list, dropping its smallest when full.
    let i = Math.min(n, keep)
    if (i === keep && t.amount <= top[keep - 1]!) continue
    if (i === keep) i--
    while (i > 0 && top[i - 1]! < t.amount) {
      top[i] = top[i - 1]!
      i--
    }
    top[i] = t.amount
    n = Math.min(n + 1, keep)
  }
  if (n < keep) return { floor: -Infinity, ties: Infinity }
  const floor = top[keep - 1]!
  let above = 0
  for (let i = 0; i < keep; i++) if (top[i]! > floor) above++
  return { floor, ties: keep - above }
}

/**
 * Whether to draw `text` now. Heals, ₽ and other non-damage text always show.
 * In `reduced`, a number at exactly the floor spends one of `budget.ties`, so
 * call this once per text per frame.
 */
export const showsText = (text: FloatText, mode: DamageNumbers, bossId: number | null, budget: DamageBudget) => {
  if (!text.damage || mode === 'all') return true
  if (mode === 'off' || text.life >= REDUCED.life) return false
  if (text.target === bossId || text.amount > budget.floor) return true
  if (text.amount < budget.floor || budget.ties <= 0) return false
  budget.ties--
  return true
}

/** Fade-out alpha of a text, over its last 0.2 s of a `life`-second show. */
export const textAlpha = (text: FloatText, mode: DamageNumbers) =>
  Math.min(1, ((text.damage && mode === 'reduced' ? REDUCED.life : 0.7) - text.life) * 5)
