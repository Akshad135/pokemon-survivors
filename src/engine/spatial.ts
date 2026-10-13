/**
 * Uniform spatial hash for broad-phase collision. Stores indices into an
 * external array (e.g. `game.enemies`) and is rebuilt every tick.
 */
export type Grid = { cell: number; cells: Map<number, number[]>; used: number[][] }

export const createGrid = (cell: number): Grid => ({ cell, cells: new Map(), used: [] })

const key = (cx: number, cy: number) => (cx + 32768) * 65536 + (cy + 32768)

export const clearGrid = (grid: Grid) => {
  for (const bucket of grid.used) bucket.length = 0
  grid.used.length = 0
}

export const insert = (grid: Grid, index: number, x: number, y: number) => {
  const k = key(Math.floor(x / grid.cell), Math.floor(y / grid.cell))
  let bucket = grid.cells.get(k)
  if (!bucket) grid.cells.set(k, (bucket = []))
  if (bucket.length === 0) grid.used.push(bucket)
  bucket.push(index)
}

/** Collects indices of every bucket overlapping the square around (x, y) into `out`. */
export const query = (grid: Grid, x: number, y: number, radius: number, out: number[]) => {
  out.length = 0
  const minX = Math.floor((x - radius) / grid.cell)
  const maxX = Math.floor((x + radius) / grid.cell)
  const minY = Math.floor((y - radius) / grid.cell)
  const maxY = Math.floor((y + radius) / grid.cell)
  for (let cx = minX; cx <= maxX; cx++) {
    for (let cy = minY; cy <= maxY; cy++) {
      const bucket = grid.cells.get(key(cx, cy))
      if (bucket) for (const i of bucket) out.push(i)
    }
  }
  return out
}
