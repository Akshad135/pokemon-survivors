/**
 * Code-authored pixel art. Sprites are written as string rows where each
 * character maps to a palette color ('.' or ' ' = transparent).
 */
export type Palette = Readonly<Record<string, string>>
export type PixelSprite = HTMLCanvasElement

export const createCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}

export const context2d = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!
  ctx.imageSmoothingEnabled = false
  return ctx
}

export const fromStrings = (rows: readonly string[], palette: Palette, opts: { mirror?: boolean } = {}): PixelSprite => {
  const width = Math.max(...rows.map((r) => r.length))
  const canvas = createCanvas(width, rows.length)
  const ctx = context2d(canvas)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]!]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(opts.mirror ? width - 1 - x : x, y, 1, 1)
    }
  })
  return canvas
}

/** Swaps palette colors of a string sprite – handy for item/candy tiers. */
export const recolor = (rows: readonly string[], palette: Palette) => fromStrings(rows, palette)

const memo = <A extends readonly unknown[], R>(fn: (...args: A) => R) => {
  const cache = new Map<string, R>()
  return (...args: A) => {
    const k = args.join('|')
    let v = cache.get(k)
    if (v === undefined) cache.set(k, (v = fn(...args)))
    return v
  }
}

/** Hard-edged filled ellipse (no antialiasing). Cached per size/color. */
export const ellipse = memo((rx: number, ry: number, color: string): PixelSprite => {
  const w = Math.round(rx) * 2 + 1
  const h = Math.round(ry) * 2 + 1
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  ctx.fillStyle = color
  const cx = (w - 1) / 2
  const cy = (h - 1) / 2
  for (let y = 0; y < h; y++) {
    const dy = (y - cy) / (ry + 0.5)
    const span = Math.sqrt(Math.max(0, 1 - dy * dy)) * (rx + 0.5)
    const x0 = Math.round(cx - span)
    const x1 = Math.round(cx + span)
    if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1)
  }
  return canvas
})

/** Hard-edged ring (circle outline) of a given thickness. Cached. */
export const ring = memo((radius: number, thickness: number, color: string): PixelSprite => {
  const r = Math.round(radius)
  const size = r * 2 + 1
  const canvas = createCanvas(size, size)
  const ctx = context2d(canvas)
  ctx.fillStyle = color
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y)
      if (d <= r + 0.5 && d > r + 0.5 - thickness) ctx.fillRect(x + r, y + r, 1, 1)
    }
  }
  return canvas
})

/** Draws a sprite centered at (x, y), snapped to whole pixels. */
export const blitCentered = (ctx: CanvasRenderingContext2D, sprite: CanvasImageSource & { width: number; height: number }, x: number, y: number) =>
  ctx.drawImage(sprite, Math.round(x - sprite.width / 2), Math.round(y - sprite.height / 2))

/** Draws a sprite centered at (x, y) rotated by `angle`. Rotation keeps the chunky pixel look at low res. */
export const blitRotated = (ctx: CanvasRenderingContext2D, sprite: PixelSprite, x: number, y: number, angle: number, scale = 1) => {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(angle)
  if (scale !== 1) ctx.scale(scale, scale)
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2)
  ctx.restore()
}

/* ---------- Bitmap font for in-world numbers (3x5 glyphs, outlined) ---------- */

const GLYPHS: Record<string, readonly string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '011', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '!': ['1', '1', '1', '0', '1'],
  '+': ['000', '010', '111', '010', '000'],
  '₽': ['0110', '0101', '0110', '1110', '0100'],
}

/** Renders text with a 1px dark outline into a cached sprite. */
export const textSprite = memo((text: string, color: string, outline: string = '#181010'): PixelSprite => {
  const chars = [...text].map((c) => GLYPHS[c] ?? GLYPHS['0']!)
  const width = chars.reduce((w, g) => w + g[0]!.length + 1, 1)
  const canvas = createCanvas(width + 1, 7)
  const ctx = context2d(canvas)
  const plot = (fill: string, dx: number, dy: number) => {
    ctx.fillStyle = fill
    let ox = 1
    for (const g of chars) {
      g.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === '1') ctx.fillRect(ox + x + dx, 1 + y + dy, 1, 1)
      })
      ox += g[0]!.length + 1
    }
  }
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]] as const) plot(outline, dx, dy)
  plot(color, 0, 0)
  return canvas
})
