import type { FloatText } from './types'

/**
 * Damage numbers grouped per target, so a boss under a dozen moves shows a few
 * growing totals instead of a strip of overlapping digits. Pure: `placeDamage`
 * only decides, `damageText` in `effects.ts` applies it.
 */

/** A number keeps absorbing same-colored hits on its target this long after it appears. */
export const MERGE_WINDOW = 0.3
/** Numbers alive at once over one target. */
export const MAX_PER_TARGET = 3
/** A full target only gives up a number this old (already fading), so its totals get time to grow. */
export const RECYCLE_AFTER = 0.45
/** Where each of a target's numbers sits, in px from its anchor: a fixed stagger, never random. */
export const SLOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: -12, y: 7 },
  { x: 12, y: 12 },
] as const satisfies readonly { x: number; y: number }[] & { length: typeof MAX_PER_TARGET }

export type DamagePlacement =
  /** Add to `texts[index]`. */
  | { kind: 'merge'; index: number }
  /** Open a new number in this slot. */
  | { kind: 'new'; slot: number }
  /** The target is full and nothing matches: restart its oldest number. */
  | { kind: 'recycle'; index: number }
  /** The target is full and nothing can give way yet: no number for this hit. */
  | { kind: 'skip' }

/**
 * Where a hit's number goes. The color is the grouping key, so super-effective,
 * resisted, warded and status numbers never melt into each other:
 * 1. the newest same-colored number on the target, while it's in its merge window;
 * 2. else a free slot, while the target has fewer than `MAX_PER_TARGET`;
 * 3. else (full) the newest same-colored number anyway, or the oldest one restarts
 *    once it's fading (`RECYCLE_AFTER`); until then the hit shows no number.
 */
export const placeDamage = (texts: readonly FloatText[], target: number, color: string): DamagePlacement => {
  let newest = -1
  let oldest = -1
  let used = 0
  let count = 0
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i]!
    if (t.target !== target) continue
    count++
    used |= 1 << t.slot
    if (t.color === color && (newest < 0 || t.life < texts[newest]!.life)) newest = i
    if (oldest < 0 || t.life > texts[oldest]!.life) oldest = i
  }
  if (newest >= 0 && texts[newest]!.life < MERGE_WINDOW) return { kind: 'merge', index: newest }
  if (count < MAX_PER_TARGET) {
    let slot = 0
    while (used & (1 << slot)) slot++
    return { kind: 'new', slot }
  }
  if (newest >= 0) return { kind: 'merge', index: newest }
  return texts[oldest]!.life >= RECYCLE_AFTER ? { kind: 'recycle', index: oldest } : { kind: 'skip' }
}
