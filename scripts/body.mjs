// Measures a sprite's body (the opaque box of the first Walk frame) straight from
// the PNG, so the game's hitboxes are data (`body` in sprites.generated.json)
// instead of a canvas readback that depends on when the image downloaded.
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'

/** Alpha of every pixel of an 8-bit, non-interlaced RGBA or palette PNG. */
const decodeAlpha = (png) => {
  let at = 8
  let header = null
  let palette = null
  let alphas = null
  const idat = []
  while (at < png.length) {
    const length = png.readUInt32BE(at)
    const type = png.toString('ascii', at + 4, at + 8)
    const data = png.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] }
    if (type === 'PLTE') palette = data
    if (type === 'tRNS') alphas = data
    if (type === 'IDAT') idat.push(data)
    at += 12 + length
  }
  const { width, height, depth, color, interlace } = header
  const channels = { 6: 4, 3: 1 }[color]
  if (depth !== 8 || interlace !== 0 || !channels) throw new Error(`unsupported PNG (depth ${depth}, color ${color}, interlace ${interlace})`)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rows = Buffer.alloc(stride * height)
  // Undo the per-row filters (PNG spec, section 9).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const cur = raw[y * (stride + 1) + 1 + x]
      const a = x >= channels ? rows[y * stride + x - channels] : 0
      const b = y > 0 ? rows[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? rows[(y - 1) * stride + x - channels] : 0
      const p = a + b - c
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      const predictor = [0, a, b, (a + b) >> 1, paeth][filter]
      rows[y * stride + x] = (cur + predictor) & 0xff
    }
  }
  const alpha = (x, y) => (color === 6 ? rows[(y * width + x) * 4 + 3] : (alphas?.[rows[y * width + x]] ?? (palette ? 255 : 255)))
  return { width, height, alpha }
}

/**
 * The opaque box of the frame at the sheet's top left, like the game measured
 * it in a canvas: `bodyW`, `bodyH` and `footY` (feet below the frame's center).
 */
export const measureBody = async (file, frameWidth, frameHeight) => {
  const { alpha } = decodeAlpha(await readFile(file))
  let minX = frameWidth, maxX = 0, minY = frameHeight, maxY = 0
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      if (alpha(x, y) > 0) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    }
  }
  return { bodyW: maxX - minX + 1, bodyH: maxY - minY + 1, footY: maxY - frameHeight / 2 }
}
