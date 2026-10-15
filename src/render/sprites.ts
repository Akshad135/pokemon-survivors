import { bodyOf, type Body } from '../data/bodies'
import type { MegaForm } from '../data/megas'
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
type ManifestVariant = { anims: ManifestAnims; portrait?: boolean; body?: Body }
type ManifestEntry = ManifestVariant & {
  shiny?: ManifestVariant
  forms?: Record<string, ManifestVariant & { shiny?: ManifestVariant }>
  /** Forms with a cry of their own in `<form>/cry.ogg` (`FORM_CRIES`), with or without sheets. */
  formCries?: string[]
}
const MANIFEST = manifest as Record<string, ManifestEntry>

type Manifest = typeof manifest
/** An alternate form with its own sheets (`FORMS` in scripts/dex.mjs), like Aegislash's `blade`. Inferred from the manifest. */
export type Form = { [K in keyof Manifest]: Manifest[K] extends { forms: infer F } ? keyof F : never }[keyof Manifest]

/** A form the game may ask for: one with sheets, or a Mega's, whose sheets SpriteCollab may not have yet (then the normal ones stand in). */
type FormKey = Form | MegaForm

const base = (dex: Dex) => `${import.meta.env.BASE_URL}assets/pokemon/${dex}`
/** Alternate forms live in a `<form>/` subfolder, shinies in a `shiny/` one below the form's, each with their own sheets. */
const variantBase = (dex: Dex, shiny: boolean, form?: FormKey) => `${base(dex)}${form ? `/${form}` : ''}${shiny ? '/shiny' : ''}`
const cacheKey = (dex: Dex, shiny: boolean, form?: FormKey) => `${dex}${form ? `:${form}` : ''}${shiny ? 's' : ''}`

const manifestVariant = (dex: Dex, shiny: boolean, form?: FormKey) => {
  const entry = MANIFEST[String(dex)]
  const variant = form ? entry?.forms?.[form] : entry
  return shiny ? variant?.shiny : variant
}

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

/** Loads (once) every sheet, the portrait and cry URL of a species variant. Concurrent calls share one request. */
export const loadSpecies = (dex: Dex, shiny = false, form?: FormKey): Promise<SpeciesSprites> => {
  const key = cacheKey(dex, shiny, form)
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)
  const inFlight = pending.get(key) ?? fetchSpecies(dex, shiny, form).finally(() => pending.delete(key))
  pending.set(key, inFlight)
  return inFlight
}

const fetchSpecies = async (dex: Dex, shiny: boolean, form?: FormKey): Promise<SpeciesSprites> => {
  const key = cacheKey(dex, shiny, form)
  const variant = manifestVariant(dex, shiny, form)
  const anims = variant?.anims
  if (!anims) throw new Error(`Missing ${shiny ? 'shiny ' : ''}${form ?? ''} sprites for #${dex}. Run npm run assets.`)
  const dir = variantBase(dex, shiny, form)

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
  // A missing portrait shouldn't block a run: fall back to the walk sheet. Forms ship none and use the normal one.
  const portrait = await loadImage(form ? portraitUrl(dex, shiny) : `${dir}/portrait.png`).catch(() => loadImage(`${dir}/Walk.png`))
  const sprites: SpeciesSprites = {
    dex,
    anims: { Walk, Idle, Hurt },
    portrait,
    cry: cryUrl(dex, form),
    // A form's own body only places its sheets; hitboxes keep the species' `bodyOf`.
    ...((form && variant.body) || bodyOf(dex, shiny)),
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
/** Downloads `sprites` already kicked off: dex numbers (normal forms) and alternate form cache keys. */
const requested = new Set<Dex | string>()

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

/** Loads every alternate form (and its shiny, if asked) of these species in the background, so a swap never waits. */
export const preloadForms = (dexes: readonly Dex[], shiny: boolean) =>
  Promise.allSettled(
    dexes.flatMap((dex) =>
      Object.keys(MANIFEST[String(dex)]?.forms ?? {}).flatMap((form) =>
        // Keys come from the manifest the `Form` type is inferred from.
        [loadSpecies(dex, false, form as Form), ...(shiny ? [loadSpecies(dex, true, form as Form)] : [])],
      ),
    ),
  )

/** An alternate form's sprites if loaded; otherwise starts (once) loading them and returns undefined. */
const formSprites = (dex: Dex, shiny: boolean, form: FormKey) => {
  const key = cacheKey(dex, shiny, form)
  const s = cache.get(key)
  if (!s && !requested.has(key) && manifestVariant(dex, shiny, form)) {
    requested.add(key)
    void loadSpecies(dex, shiny, form).catch(() => {})
  }
  return s
}

/**
 * Sprites of a species variant: a shiny form SpriteCollab lacks (Mega Tyranitar) wears the form's
 * normal colors, an alternate form falls back to the species' own colors, a shiny to the normal
 * colors, then to a dust puff while it downloads. Never throws.
 */
export const sprites = (dex: Dex, shiny = false, form?: FormKey) =>
  (form && (formSprites(dex, shiny, form) || (shiny && !manifestVariant(dex, true, form) && formSprites(dex, false, form)))) ||
  (shiny && cache.get(cacheKey(dex, true))) ||
  cache.get(cacheKey(dex, false)) ||
  pendingSprites(dex)

export const portraitUrl = (dex: Dex, shiny = false) =>
  `${variantBase(dex, shiny && MANIFEST[String(dex)]?.shiny?.portrait === true)}/portrait.png`

/** Sprites if already loaded, without throwing (menus draw progressively). */
export const loadedSprites = (dex: Dex, shiny = false): SpeciesSprites | undefined => cache.get(cacheKey(dex, shiny))

/** A species' cry, or its form's own (Megas) when PokeAPI has one. */
export const cryUrl = (dex: Dex, form?: FormKey) =>
  form && MANIFEST[String(dex)]?.formCries?.includes(form) ? `${base(dex)}/${form}/cry.ogg` : `${base(dex)}/cry.ogg`

/** True when a form has sheets of its own; without them `sprites` draws the normal form. */
export const hasSheets = (dex: Dex, form: FormKey) => manifestVariant(dex, false, form) !== undefined

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
  /** A hard 1 px outline in this color around the silhouette (elites, enraged bosses). */
  outline?: string
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
  if (opts.outline) {
    const edge = tinted(sheet.white, opts.outline)
    ctx.drawImage(edge, sx, sy, sheet.fw, sheet.fh, dx - 1, dy, dw, dh)
    ctx.drawImage(edge, sx, sy, sheet.fw, sheet.fh, dx + 1, dy, dw, dh)
    ctx.drawImage(edge, sx, sy, sheet.fw, sheet.fh, dx, dy - 1, dw, dh)
    ctx.drawImage(edge, sx, sy, sheet.fw, sheet.fh, dx, dy + 1, dw, dh)
  }
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
