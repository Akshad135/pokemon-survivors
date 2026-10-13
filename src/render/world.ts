import { context2d, createCanvas, fromStrings, type PixelSprite } from '../engine/pixelart'
import { hash2 } from '../engine/rng'

/**
 * Infinite procedural meadow, generated in cached chunks. Everything is
 * deterministic from world coordinates, so revisiting an area looks the same.
 */
const CHUNK = 256
const TILE = 16
const MAX_CHUNKS = 48
const SEED = 1996

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Bilinear value noise in [0, 1). */
const noise = (x: number, y: number, scale: number, seed: number) => {
  const gx = x / scale
  const gy = y / scale
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const tx = smooth(gx - x0)
  const ty = smooth(gy - y0)
  const a = hash2(x0, y0, seed)
  const b = hash2(x0 + 1, y0, seed)
  const c = hash2(x0, y0 + 1, seed)
  const d = hash2(x0 + 1, y0 + 1, seed)
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const

const LIGHT = ['#8fd068', '#88c862', '#80c05c'].map(hex)
const DARK = ['#74b452', '#6eac4e', '#67a448'].map(hex)
const PATH = ['#d8c088', '#d0b880', '#c8b078'].map(hex)

const TUFT = ['.1...1.', '121.121', '1221221', '.12221.']
const BLADES = ['1.1', '.1.']
const ROCK = ['.111.', '12221', '12231', '.111.']

const decor = (() => {
  let cache: { tuft: PixelSprite; blades: PixelSprite; rock: PixelSprite; flowers: PixelSprite[] } | null = null
  return () =>
    (cache ??= {
      tuft: fromStrings(TUFT, { 1: '#2f7a3a', 2: '#4f9e48' }),
      blades: fromStrings(BLADES, { 1: '#5a9a40' }),
      rock: fromStrings(ROCK, { 1: '#6a6458', 2: '#a8a090', 3: '#d8d0c0' }),
      flowers: ['#ffffff', '#f8e048', '#f87890', '#a8c8f8'].map((petal) =>
        fromStrings(['.1.', '121', '.1.'], { 1: petal, 2: '#f8b030' }),
      ),
    })
})()

const buildChunk = (cx: number, cy: number) => {
  const canvas = createCanvas(CHUNK, CHUNK)
  const ctx = context2d(canvas)
  const img = ctx.createImageData(CHUNK, CHUNK)
  const ox = cx * CHUNK
  const oy = cy * CHUNK

  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      const wx = ox + x
      const wy = oy + y
      const meadow = noise(wx, wy, 96, SEED)
      const path = Math.abs(noise(wx, wy, 220, SEED + 7) - 0.5) < 0.025
      const palette = path ? PATH : meadow > 0.55 ? DARK : LIGHT
      // Ordered-ish dither: mostly the base shade with sparse lighter/darker pixels.
      const r = hash2(wx, wy, SEED + 1)
      const [cr, cg, cb] = palette[r < 0.7 ? 0 : r < 0.9 ? 1 : 2]!
      const i = (y * CHUNK + x) * 4
      img.data[i] = cr
      img.data[i + 1] = cg
      img.data[i + 2] = cb
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const art = decor()
  for (let ty = 0; ty < CHUNK / TILE; ty++) {
    for (let tx = 0; tx < CHUNK / TILE; tx++) {
      const wx = ox + tx * TILE
      const wy = oy + ty * TILE
      if (Math.abs(noise(wx, wy, 220, SEED + 7) - 0.5) < 0.04) continue // keep paths clean
      const x = tx * TILE
      const y = ty * TILE
      if (noise(wx, wy, 140, SEED + 3) > 0.68) {
        // Tall grass patch – the classic encounter tile.
        ctx.drawImage(art.tuft, x + 1, y + 3)
        ctx.drawImage(art.tuft, x + 9, y + 3)
        ctx.drawImage(art.tuft, x + 5, y + 10)
        continue
      }
      const roll = hash2(tx + cx * 64, ty + cy * 64, SEED + 2)
      const jx = Math.floor(hash2(wx, wy, SEED + 4) * 10)
      const jy = Math.floor(hash2(wx, wy, SEED + 5) * 10)
      if (roll < 0.05) {
        const flower = art.flowers[Math.floor(hash2(wx, wy, SEED + 6) * art.flowers.length)]!
        ctx.drawImage(flower, x + jx, y + jy)
        ctx.drawImage(flower, x + ((jx + 5) % 12), y + ((jy + 4) % 12))
      } else if (roll < 0.2) {
        ctx.drawImage(art.blades, x + jx, y + jy)
      } else if (roll < 0.215) {
        ctx.drawImage(art.rock, x + jx, y + jy)
      }
    }
  }
  return canvas
}

const chunks = new Map<string, HTMLCanvasElement>()

const chunkAt = (cx: number, cy: number) => {
  const key = `${cx},${cy}`
  let chunk = chunks.get(key)
  if (!chunk) {
    chunk = buildChunk(cx, cy)
    chunks.set(key, chunk)
    if (chunks.size > MAX_CHUNKS) chunks.delete(chunks.keys().next().value!)
  }
  return chunk
}

/** Draws the ground under a camera whose top-left is (camX, camY). */
export const drawGround = (ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) => {
  const x0 = Math.floor(camX / CHUNK)
  const y0 = Math.floor(camY / CHUNK)
  const x1 = Math.floor((camX + w) / CHUNK)
  const y1 = Math.floor((camY + h) / CHUNK)
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) ctx.drawImage(chunkAt(cx, cy), cx * CHUNK - camX, cy * CHUNK - camY)
  }
}
