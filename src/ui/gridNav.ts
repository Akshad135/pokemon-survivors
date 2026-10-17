export type Step = 'left' | 'right' | 'up' | 'down'

/**
 * The cell an arrow leads to in a row-major grid of `count` cells, `cols`
 * wide (the partner select's rosters). ← → walk the reading order (spilling
 * into the row before or after) and stop at the ends; ↑ ↓ move a row, and a
 * ↓ into a short last row lands on its last cell. Leaving through the top or
 * the bottom row returns `'above'` / `'below'`, so the screen can move on (the
 * starters' bottom row leads to the eggs, the eggs' top row back).
 */
export const stepGrid = (index: number, step: Step, cols: number, count: number): number | 'above' | 'below' => {
  if (step === 'left') return Math.max(0, index - 1)
  if (step === 'right') return Math.min(count - 1, index + 1)
  if (step === 'up') return index - cols >= 0 ? index - cols : 'above'
  if (index + cols < count) return index + cols
  return Math.floor(index / cols) < Math.floor((count - 1) / cols) ? count - 1 : 'below'
}
