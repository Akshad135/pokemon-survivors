import manifest from '../data/sprites.generated.json'
import { createCanvas, context2d } from '../engine/pixelart'
import type { Dir8 } from '../engine/math'

/**
 * Loader/renderer for PMD SpriteCollab sheets. Each sheet has 8 rows (one per
 * direction) and N columns (frames). Durations are in 1/60s ticks.
 */
export type AnimName = 'Walk' | 'Idle' | 'Hurt'
export type Dex = number

type Sheet = {
  img: HTMLImageElement
  white: HTMLCanvasElement
  fw: number
  fh: number
  durations: readonly number[]
  totalTicks: number
}

export type SpeciesSprites = {
  dex: Dex
  anims: Record<AnimName, Sheet>
  portrait: HTMLImageElement
  cry: string
  /** Distance from frame center down to the feet, in px. */
  footY: number
  /** Opaque body size measured on the first Walk frame. */
  bodyW: number
  bodyH: number
}

type ManifestAnims = Partial<Record<AnimName, { frameWidth: number; frameHeight: number; durations: number[] }>>
type ManifestEntry = { anims: ManifestAnims; shiny?: { anims: ManifestAnims; portrait: boolean } }
const MANIFEST = manifest as Record<string, ManifestEntry>

const base = (dex: Dex) => `${import.meta.env.BASE_URL}assets/pokemon/${dex}`
/** Shiny forms live in a `shiny/` subfolder with their own sheets and portrait. */
const variantBase = (dex: Dex, shiny: boolean) => (shiny ? `${base(dex)}/shiny` : base(dex))
const cacheKey = (dex: Dex, shiny: boolean) => (shiny ? `${dex}s` : String(dex))

export const hasShiny = (dex: Dex) => MANIFEST[String(dex)]?.shiny !== undefined

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })

/** Solid white silhouette used for hit flashes and the evolution sequence. */
const silhouette = (img: HTMLImageElement) => {
  const canvas = createCanvas(img.width, img.height)
  const ctx = context2d(canvas)
  ctx.drawImage(img, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, img.width, img.height)
  return canvas
}

const tints = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>()

/** Silhouette recolored to `color`, cached per sheet and color (status tints). */
const tinted = (white: HTMLCanvasElement, color: string) => {
  let byColor = tints.get(white)
  if (!byColor) tints.set(white, (byColor = new Map()))
  let canvas = byColor.get(color)
  if (!canvas) {
    canvas = createCanvas(white.width, white.height)
    const ctx = context2d(canvas)
    ctx.drawImage(white, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    byColor.set(color, canvas)
  }
  return canvas
}

const measure = (sheet: Sheet) => {
  const canvas = createCanvas(sheet.fw, sheet.fh)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(sheet.img, 0, 0, sheet.fw, sheet.fh, 0, 0, sheet.fw, sheet.fh)
  const { data } = ctx.getImageData(0, 0, sheet.fw, sheet.fh)
  let minX = sheet.fw, maxX = 0, minY = sheet.fh, maxY = 0
  for (let y = 0; y < sheet.fh; y++) {
    for (let x = 0; x < sheet.fw; x++) {
      if (data[(y * sheet.fw + x) * 4 + 3]! > 0) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    }
  }
  return { footY: maxY - sheet.fh / 2, bodyW: maxX - minX + 1, bodyH: maxY - minY + 1 }
}

const cache = new Map<string, SpeciesSprites>()
const pending = new Map<string, Promise<SpeciesSprites>>()

/** Loads (once) every sheet, the portrait and cry URL of a species form. Concurrent calls share one request. */
export const loadSpecies = (dex: Dex, shiny = false): Promise<SpeciesSprites> => {
  const key = cacheKey(dex, shiny)
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)
  const inFlight = pending.get(key) ?? fetchSpecies(dex, shiny).finally(() => pending.delete(key))
  pending.set(key, inFlight)
  return inFlight
}

const fetchSpecies = async (dex: Dex, shiny: boolean): Promise<SpeciesSprites> => {
  const key = cacheKey(dex, shiny)
  const entry = MANIFEST[String(dex)]
  const anims = shiny ? entry?.shiny?.anims : entry?.anims
  if (!anims) throw new Error(`Missing ${shiny ? 'shiny ' : ''}sprites for #${dex}. Run npm run assets.`)
  const dir = variantBase(dex, shiny)

  const loadSheet = async (name: AnimName): Promise<Sheet> => {
    const meta = anims[name] ?? anims.Walk!
    const img = await loadImage(`${dir}/${anims[name] ? name : 'Walk'}.png`)
    return {
      img,
      white: silhouette(img),
      fw: meta.frameWidth,
      fh: meta.frameHeight,
      durations: meta.durations,
      totalTicks: meta.durations.reduce((a, b) => a + b, 0),
    }
  }

  const [Walk, Idle, Hurt] = await Promise.all([loadSheet('Walk'), loadSheet('Idle'), loadSheet('Hurt')])
  // A missing portrait shouldn't block a run: fall back to the walk sheet.
  const portrait = await loadImage(`${dir}/portrait.png`).catch(() => Walk.img)
  const sprites: SpeciesSprites = {
    dex,
    anims: { Walk, Idle, Hurt },
    portrait,
    cry: cryUrl(dex),
    ...measure(Walk),
  }
  cache.set(key, sprites)
  return sprites
}

export const loadAll = (dexes: readonly Dex[]) => Promise.all(dexes.map((dex) => loadSpecies(dex)))

/** Loads shiny forms in the background. Until one is ready, `sprites` falls back to the normal form. */
export const preloadShinies = (dexes: readonly Dex[]) =>
  Promise.allSettled(dexes.filter(hasShiny).map((dex) => loadSpecies(dex, true)))

export const sprites = (dex: Dex, shiny = false) => {
  const s = (shiny && cache.get(cacheKey(dex, true))) || cache.get(cacheKey(dex, false))
  if (!s) throw new Error(`Sprites for #${dex} not loaded`)
  return s
}

export const portraitUrl = (dex: Dex, shiny = false) =>
  `${variantBase(dex, shiny && MANIFEST[String(dex)]?.shiny?.portrait === true)}/portrait.png`

/** Sprites if already loaded, without throwing (menus draw progressively). */
export const loadedSprites = (dex: Dex, shiny = false): SpeciesSprites | undefined => cache.get(cacheKey(dex, shiny))

export const cryUrl = (dex: Dex) => `${base(dex)}/cry.ogg`

const frameIndex = (sheet: Sheet, seconds: number, loop: boolean) => {
  let tick = Math.floor(seconds * 60)
  tick = loop ? tick % sheet.totalTicks : Math.min(tick, sheet.totalTicks - 1)
  for (let i = 0; i < sheet.durations.length; i++) {
    tick -= sheet.durations[i]!
    if (tick < 0) return i
  }
  return sheet.durations.length - 1
}

export type DrawOpts = {
  /** 0..1 white overlay strength (hit flash). 1 = full silhouette. */
  flash?: number
  alpha?: number
  loop?: boolean
  /** Integer upscale (evolution scene, menus). */
  scale?: number
  /** Colored overlay (status conditions); `amount` is 0..1 opacity. */
  tint?: { color: string; amount: number }
}

/** Draws a species at its feet position (x, y). */
export const drawPokemon = (
  ctx: CanvasRenderingContext2D,
  s: SpeciesSprites,
  anim: AnimName,
  dir: Dir8,
  seconds: number,
  x: number,
  y: number,
  opts: DrawOpts = {},
) => {
  const sheet = s.anims[anim]
  const frame = frameIndex(sheet, seconds, opts.loop ?? true)
  const sx = frame * sheet.fw
  const sy = dir * sheet.fh
  const k = opts.scale ?? 1
  const dw = sheet.fw * k
  const dh = sheet.fh * k
  const dx = Math.round(x - dw / 2)
  const dy = Math.round(y - (s.footY + sheet.fh / 2) * k)
  const alpha = opts.alpha ?? 1
  const flash = opts.flash ?? 0
  if (alpha !== 1) ctx.globalAlpha = alpha
  if (flash < 1) ctx.drawImage(sheet.img, sx, sy, sheet.fw, sheet.fh, dx, dy, dw, dh)
  const tint = opts.tint
  if (tint && tint.amount > 0 && flash < 1) {
    ctx.globalAlpha = alpha * Math.min(1, tint.amount)
    ctx.drawImage(tinted(sheet.white, tint.color), sx, sy, sheet.fw, sheet.fh, dx, dy, dw, dh)
  }
  if (flash > 0) {
    ctx.globalAlpha = alpha * Math.min(1, flash)
    ctx.drawImage(sheet.white, sx, sy, sheet.fw, sheet.fh, dx, dy, dw, dh)
  }
  ctx.globalAlpha = 1
}
