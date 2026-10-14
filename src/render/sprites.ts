import { bodyOf } from '../data/bodies'
import manifest from '../data/sprites.generated.json'
import { createCanvas, context2d, fromStrings } from '../engine/pixelart'
import type { Dir8 } from '../engine/math'

/**
 * Loader/renderer for PMD SpriteCollab sheets. Each sheet has 8 rows (one per
 * direction) and N columns (frames). Durations are in 1/60s ticks.
 */
export type AnimName = 'Walk' | 'Idle' | 'Hurt'
export type Dex = number

type Sheet = {
  img: HTMLImageElement | HTMLCanvasElement
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
  /** Opaque body size on the first Walk frame (`bodyOf`). */
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
const silhouette = (img: HTMLImageElement | HTMLCanvasElement) => {
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
  const portrait = await loadImage(`${dir}/portrait.png`).catch(() => loadImage(`${dir}/Walk.png`))
  const sprites: SpeciesSprites = {
    dex,
    anims: { Walk, Idle, Hurt },
    portrait,
    cry: cryUrl(dex),
    ...bodyOf(dex, shiny),
  }
  cache.set(key, sprites)
  return sprites
}

export const loadAll = (dexes: readonly Dex[]) => Promise.all(dexes.map((dex) => loadSpecies(dex)))

/** Loads shiny forms in the background. Until one is ready, `sprites` falls back to the normal form. */
export const preloadShinies = (dexes: readonly Dex[]) =>
  Promise.allSettled(dexes.filter(hasShiny).map((dex) => loadSpecies(dex, true)))

/**
 * Loads species one after another in the background (normal forms first, then
 * their shinies), so a run's later stages stream in without hogging the network.
 * Stops early once `keepGoing` turns false (the run ended).
 */
export const streamSpecies = async (dexes: readonly Dex[], keepGoing: () => boolean = () => true) => {
  for (const dex of dexes) {
    if (!keepGoing()) return
    await loadSpecies(dex).catch(() => {})
  }
  for (const dex of dexes.filter(hasShiny)) {
    if (!keepGoing()) return
    await loadSpecies(dex, true).catch(() => {})
  }
}

/** A puff of dust, drawn in place of a species that hasn't finished downloading. */
const PUFF = [
  '...1111.....',
  '..122221.11.',
  '.12233321221',
  '123333333321',
  '123333333331',
  '.1233333321.',
  '..11222211..',
  '....1111....',
]

let puff: Sheet | null = null
const standIns = new Map<Dex, SpeciesSprites>()
const requested = new Set<Dex>()

/** Stand-in sprites for `dex`, which also starts (once) downloading the real ones. */
const pendingSprites = (dex: Dex): SpeciesSprites => {
  if (!requested.has(dex)) {
    requested.add(dex)
    void loadSpecies(dex).catch(() => {})
  }
  let s = standIns.get(dex)
  if (!s) {
    if (!puff) {
      const frame = fromStrings(PUFF, { 1: '#6c7058', 2: '#b0b098', 3: '#e0e0c8' })
      const img = createCanvas(frame.width, frame.height * 8)
      for (let row = 0; row < 8; row++) context2d(img).drawImage(frame, 0, row * frame.height)
      puff = { img, white: silhouette(img), fw: frame.width, fh: frame.height, durations: [60], totalTicks: 60 }
    }
    // The puff stands where the Pokémon will: same feet and body as its real sprite.
    s = { dex, anims: { Walk: puff, Idle: puff, Hurt: puff }, portrait: new Image(), cry: cryUrl(dex), ...bodyOf(dex) }
    standIns.set(dex, s)
  }
  return s
}

/** Sprites of a species form, falling back to the normal form, then to a dust puff while it downloads. Never throws. */
export const sprites = (dex: Dex, shiny = false) =>
  (shiny && cache.get(cacheKey(dex, true))) || cache.get(cacheKey(dex, false)) || pendingSprites(dex)

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
