import { blitCentered, blitEllipse, canvasCache, context2d, createCanvas, type PixelSprite } from '../engine/pixelart'
import { TAU } from '../engine/math'
import type { EvoItemId } from '../data/shop'
import type { Pickup } from '../game/types'
import { shopIconUrl } from '../ui/shopIcons'
import { px } from './shopTmFx'

type Ctx = CanvasRenderingContext2D

/** The shop icons, loaded once each (decoded or not): the ground sprite is cut from them. */
const images = new Map<EvoItemId, HTMLImageElement>()

/** The ground sprites, halved from the icons (`halve`). */
const sprites = canvasCache<EvoItemId, PixelSprite>()

/**
 * A 32 px shop icon halved to 16 px, the size of a TM disc on the ground: each
 * pixel is its 2×2 block's average color, solid when the block is at least
 * half covered and see-through otherwise, so the edges stay hard.
 */
const halve = (img: HTMLImageElement): PixelSprite => {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const src = createCanvas(w, h)
  const sctx = context2d(src)
  sctx.drawImage(img, 0, 0)
  const from = sctx.getImageData(0, 0, w, h).data
  src.width = src.height = 0
  const out = createCanvas(w / 2, h / 2)
  const octx = context2d(out)
  const to = octx.createImageData(out.width, out.height)
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const i = ((y * 2 + dy) * w + x * 2 + dx) * 4
        const alpha = from[i + 3]!
        r += from[i]! * alpha
        g += from[i + 1]! * alpha
        b += from[i + 2]! * alpha
        a += alpha
      }
      if (a < 2 * 255) continue
      const o = (y * out.width + x) * 4
      to.data[o] = r / a
      to.data[o + 1] = g / a
      to.data[o + 2] = b / a
      to.data[o + 3] = 255
    }
  }
  octx.putImageData(to, 0, 0)
  return out
}

/** The ground sprite of an item, or null while its icon loads (the first call starts it). */
const groundSprite = (id: EvoItemId): PixelSprite | null => {
  const cached = sprites.get(id)
  if (cached) return cached
  let img = images.get(id)
  if (!img) {
    img = new Image()
    img.src = shopIconUrl(id)
    images.set(id, img)
  }
  if (!img.complete || img.naturalWidth === 0) return null
  const sprite = halve(img)
  sprites.set(id, sprite)
  return sprite
}

/** An evolution item a boss dropped: its icon over a soft glow, with sparkles turning round it. */
export const drawEvoItem = (ctx: Ctx, k: Extract<Pickup, { kind: 'evoItem' }>, x: number, y: number, t: number) => {
  if (!k.attracted) blitEllipse(ctx, 10, 10, 'rgba(248,240,168,0.22)', x, y)
  const sprite = groundSprite(k.item)
  if (sprite) blitCentered(ctx, sprite, x, y)
  else blitEllipse(ctx, 4, 4, '#f8f0a8', x, y)
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.8 + i / 3 + k.id * 0.37) % 1
    if (ph > 0.45) continue
    const ang = (i / 3) * TAU + t * 0.6
    const sx = x + Math.cos(ang) * 10
    const sy = y + Math.sin(ang) * 8 - 2
    px(ctx, sx, sy, '#ffffff')
    if (ph < 0.2) {
      px(ctx, sx - 1, sy, '#fff8c0')
      px(ctx, sx + 1, sy, '#fff8c0')
      px(ctx, sx, sy - 1, '#fff8c0')
      px(ctx, sx, sy + 1, '#fff8c0')
    }
  }
}
