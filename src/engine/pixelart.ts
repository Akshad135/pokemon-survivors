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

/** A 1×1 context made with the first one, for when a canvas gets none. */
let spare: CanvasRenderingContext2D | null = null

/**
 * A canvas' 2D context, unsmoothed for hard pixels. iOS hands out no context once the page's
 * canvases pass its memory budget: that canvas' drawing then lands on the spare and its art
 * comes out blank, instead of the game crashing mid-run.
 */
export const context2d = (canvas: HTMLCanvasElement) => {
  spare ??= createCanvas(1, 1).getContext('2d')
  const ctx = canvas.getContext('2d', { willReadFrequently: false }) ?? spare
  if (!ctx) throw new Error('No 2D canvas context')
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

/* ---------- GPU resets ---------- */

const resets: Array<() => void> = []

/**
 * Registers how to drop a cache of drawn canvases. When the browser loses its GPU context
 * (memory pressure on phones, a driver reset), every 2D canvas comes back blank, so a cache
 * kept past that would silently draw nothing: no ground under the horde, which then smears.
 */
export const onCanvasReset = (reset: () => void) => {
  resets.push(reset)
}

/** Drops every registered cache so it redraws. Called when the game canvas gets its context back. */
export const resetCanvases = () => {
  for (const reset of resets) reset()
}

/** A Map holding drawn canvases, emptied on a GPU reset. */
export const canvasCache = <K, V>() => {
  const cache = new Map<K, V>()
  onCanvasReset(() => cache.clear())
  return cache
}

/** Builds a value holding canvases on first use, and again after a GPU reset. */
export const lazy = <T>(build: () => T) => {
  let value: T | undefined
  onCanvasReset(() => (value = undefined))
  return () => (value ??= build())
}

type Memo3<A, B, C, R> = Map<A, Map<B, Map<C, R>>>

/**
 * Caches a three-argument `fn` in nested Maps, so a hit (hundreds per frame:
 * every shadow, every damage number) allocates nothing. Past `max` entries the
 * cache starts a new generation and keeps the last one around for a while:
 * what's still drawn moves over on its next use, the rest goes with it.
 */
const memo3 = <A, B, C, R>(fn: (a: A, b: B, c: C) => R, max = Infinity) => {
  let fresh: Memo3<A, B, C, R> = new Map()
  let old: Memo3<A, B, C, R> = new Map()
  let size = 0
  onCanvasReset(() => {
    fresh = new Map()
    old = new Map()
    size = 0
  })
  const store = (a: A, b: B, c: C, v: R) => {
    let byB = fresh.get(a)
    if (!byB) fresh.set(a, (byB = new Map()))
    let byC = byB.get(b)
    if (!byC) byB.set(b, (byC = new Map()))
    byC.set(c, v)
  }
  return (a: A, b: B, c: C): R => {
    const hit = fresh.get(a)?.get(b)?.get(c)
    if (hit !== undefined) return hit
    const v = old.get(a)?.get(b)?.get(c) ?? fn(a, b, c)
    if (size >= max) {
      old = fresh
      fresh = new Map()
      size = 0
    }
    store(a, b, c, v)
    size++
    return v
  }
}

/** Hard-edged filled ellipse (no antialiasing). Cached per size/color. */
export const ellipse = memo3((rx: number, ry: number, color: string): PixelSprite => {
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
export const ring = memo3((radius: number, thickness: number, color: string): PixelSprite => {
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
  // Capitals, for short in-world tags (an Alpha's "ALFA").
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['10001', '11011', '10101', '10001', '10001'], N: ['1001', '1101', '1011', '1001', '1001'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'], W: ['10001', '10001', '10101', '11011', '10001'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
}

/**
 * Renders text with a 1px dark outline into a cached sprite. Bounded: a damage total changes
 * with every merged hit, so a long run would otherwise pile up tens of thousands of canvases.
 */
const outlinedText = memo3((text: string, color: string, outline: string): PixelSprite => {
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
}, 1024)

/** A number or short word in the in-world font, with the usual dark outline unless told otherwise. */
export const textSprite = (text: string, color: string, outline = '#181010') => outlinedText(text, color, outline)
