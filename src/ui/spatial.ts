export type Direction = 'up' | 'down' | 'left' | 'right'

/** A laid-out element's box, in CSS px (a `DOMRect` fits). */
export type Box = { readonly left: number; readonly top: number; readonly width: number; readonly height: number }

/** How far apart two spans are along one axis (0 when they overlap). */
const gap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, b0 - a1, a0 - b1)

/**
 * The box to move to from `boxes[from]` when pressing `dir`, or -1 when none
 * lies that way. A candidate's middle must lie past the current box's edge in
 * that direction. Boxes in line with it (sharing its row for ← →, its column
 * for ↑ ↓) come first, however far: → from the Trainer chip reaches `?` in the
 * top bar, not the card below it. Then the distance along the press counts
 * once and the sideways gap twice, and the offset between centers breaks ties
 * (the card right under the one above).
 */
export const nearestInDirection = (boxes: readonly Box[], from: number, dir: Direction): number => {
  const a = boxes[from]
  if (!a) return -1
  const vertical = dir === 'up' || dir === 'down'
  const sign = dir === 'down' || dir === 'right' ? 1 : -1
  let best = -1
  let score = Infinity
  boxes.forEach((b, i) => {
    if (i === from || b.width === 0 || b.height === 0) return
    const [aStart, aSize, bStart, bSize] = vertical ? [a.top, a.height, b.top, b.height] : [a.left, a.width, b.left, b.width]
    // How far b's near edge is past a's far edge, measured in the press's direction (negative when they overlap).
    const ahead = sign > 0 ? bStart - (aStart + aSize) : aStart - (bStart + bSize)
    const middle = bStart + bSize / 2
    if (sign > 0 ? middle <= aStart + aSize : middle >= aStart) return
    const side = vertical ? gap(a.left, a.left + a.width, b.left, b.left + b.width) : gap(a.top, a.top + a.height, b.top, b.top + b.height)
    const offset = vertical ? Math.abs(b.left + b.width / 2 - (a.left + a.width / 2)) : Math.abs(b.top + b.height / 2 - (a.top + a.height / 2))
    const s = (side > 0 ? 1e6 : 0) + Math.max(0, ahead) + side * 2 + offset * 0.01
    if (s < score) [score, best] = [s, i]
  })
  return best
}
