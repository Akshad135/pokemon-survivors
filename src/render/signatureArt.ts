import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'
import type { SignatureMoveId } from '../game/signatureMoves'

/**
 * Pixel art of the starter signature moves (`render/signatureFx.ts` draws
 * them, `art.ts` lists the icons). String sprites like `art.ts`; the few
 * shapes that read better as rectangles (the hammer, the spiky ball) are
 * painted in code on the same pixel grid. Everything is built lazily (the
 * DOM canvas only exists at render time). `art.ts` imports this file, so it
 * can't import `art.ts` back: it keeps its own copy of the outline.
 */

/** A 1px outline around the opaque pixels, like `outlined` in `art.ts`. */
const outlined = (s: PixelSprite, color = '#181818'): PixelSprite => {
  const canvas = createCanvas(s.width + 2, s.height + 2)
  const ctx = context2d(canvas)
  const sil = createCanvas(s.width, s.height)
  const sctx = context2d(sil)
  sctx.drawImage(s, 0, 0)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = color
  sctx.fillRect(0, 0, sil.width, sil.height)
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]] as const) ctx.drawImage(sil, dx, dy)
  ctx.drawImage(s, 1, 1)
  return canvas
}

const sprite = (rows: readonly string[], palette: Palette, outline?: string) => {
  const s = fromStrings(rows, palette)
  return outline ? outlined(s, outline) : s
}

/** A canvas painted with `fn(px)`, where `px(x, y, color, w, h)` fills whole pixels. */
const paint = (w: number, h: number, fn: (px: (x: number, y: number, color: string, w?: number, h?: number) => void) => void) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  fn((x, y, color, pw = 1, ph = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, pw, ph)
  })
  return canvas
}

/** Layers several sprites on one canvas (cluster icons). */
const compose = (w: number, h: number, layers: ReadonlyArray<readonly [PixelSprite, number, number]>) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  for (const [s, x, y] of layers) ctx.drawImage(s, x, y)
  return canvas
}

/* ---------------- Sprites ---------------- */

/** Seed with a sprout: g/G leaves, 1-3 shell. */
const SEED = ['...gG.', '..gGg.', '.1221.', '123321', '122221', '.1111.']
/** Petal: 1 rim, 2 pink, 3 shine. */
const PETAL = ['...111.', '..12221', '.122331', '1223321', '123321.', '12221..', '.111...']
/** Magma bomb: 1 crust, 2-4 hotter to the core. */
const MAGMA = ['..111..', '.12321.', '1234321', '1344431', '1234321', '.12321.', '..111..']
/** Beak-drill pointing right: 1 rim, 2/3 spiral bands, 4 tip. */
const DRILL = ['11........', '1211111...', '1232222111', '1233333334', '1232222111', '1211111...', '11........']
/** Flower: 1 rim, 2 petals, 3 shine, 4 heart. */
const FLOWER = ['.11.11.', '1221221', '1223221', '.13431.', '1223221', '1221221', '.11.11.']
/** Needle pointing right: 1 base, 2 shaft, 3 tip. */
const NEEDLE = ['11.....', '.122223', '11.....']
/** Lariat fist: 1 rim, 2 fur, 3 claw shine. */
const FIST = ['.1111.', '122221', '123321', '122221', '122221', '.1111.']
/** Anger mark (Thrash). */
const ANGER = ['.11.11.', '1.1.1.1', '11...11', '.......', '11...11', '1.1.1.1', '.11.11.']
/** Kicking foot (Double Kick): 1 rim, 2 foot, 3 claws. */
const FOOT = ['..111...', '..1221..', '..1221..', '..12211.', '.1222221', '12222221', '13131311']
/** Mud splat: 1 rim, 2 mud, 3 wet shine. */
const SPLAT = ['...11...', '..1221..', '.122221.', '12232221', '.122221.', '1.1111.1']
/** Whirlwind: 1 rim, 2 air. */
const TORNADO = ['1111111111', '.12222221.', '..111111..', '..1222221.', '...11111..', '...12221..', '....111...', '....121...', '.....1....']
/** Flame: 1 rim, 2-4 hotter. */
const FLAME = ['...1....', '..121...', '..1221..', '.12321..', '.123321.', '12343321', '12344321', '.122221.', '..1111..']
/** Water droplet, round. */
const DROP = ['...1...', '..121..', '.12221.', '1223221', '1233321', '.12221.', '..111..']

const SEED_PAL = { g: '#287018', G: '#88d850', 1: '#503010', 2: '#a07040', 3: '#e0b878' }
const FIRE_PAL = { 1: '#801808', 2: '#e05018', 3: '#f8a030', 4: '#fff0a0' }

export const SIG_FX = {
  seed: lazy(() => sprite(SEED, SEED_PAL, '#181008')),
  petal: lazy(() => [
    sprite(PETAL, { 1: '#d05888', 2: '#f890c0', 3: '#ffe8f4' }, '#601838'),
    sprite(PETAL, { 1: '#e070a0', 2: '#f8b0d8', 3: '#ffffff' }, '#601838'),
  ]),
  magma: lazy(() => [
    sprite(MAGMA, { 1: '#501008', 2: '#c03010', 3: '#f08020', 4: '#fff0a0' }, '#200800'),
    sprite(MAGMA, { 1: '#601808', 2: '#e04818', 3: '#f8b030', 4: '#ffffff' }, '#200800'),
  ]),
  drill: lazy(() => [
    sprite(DRILL, { 1: '#704808', 2: '#f8c030', 3: '#fff0a0', 4: '#ffffff' }, '#302008'),
    sprite(DRILL, { 1: '#704808', 2: '#fff0a0', 3: '#f8c030', 4: '#ffffff' }, '#302008'),
  ]),
  flower: lazy(() => sprite(FLOWER, { 1: '#b02860', 2: '#f878b0', 3: '#ffffff', 4: '#f8d030' }, '#401020')),
  needle: lazy(() => sprite(NEEDLE, { 1: '#285818', 2: '#a8d870', 3: '#ffffff' })),
  fist: lazy(() => sprite(FIST, { 1: '#300818', 2: '#583048', 3: '#f8a050' }, '#100008')),
  anger: lazy(() => sprite(ANGER, { 1: '#f83030' }, '#ffffff')),
  /** Log hammer, head to the right: handle, bark with knots, the ring-cut end. */
  hammer: lazy(() =>
    outlined(paint(17, 11, (px) => {
      px(0, 4, '#683818', 10, 3)
      px(0, 5, '#a06030', 10, 1)
      px(9, 0, '#583010', 7, 11)
      px(10, 1, '#986030', 5, 9)
      px(10, 2, '#b07840', 1, 7)
      px(12, 3, '#704018', 2, 1)
      px(11, 7, '#704018', 2, 1)
      px(14, 1, '#e0c080', 2, 9)
      px(15, 3, '#a07040', 1, 5)
      px(14, 5, '#a07040', 1, 1)
      px(16, 2, '#e0c080', 1, 7)
    }), '#201008'),
  ),
  /** Chestnut quills: a green shell with eight spikes. */
  spikyBall: lazy(() =>
    outlined(paint(11, 11, (px) => {
      for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5], [2, 2], [8, 2], [2, 8], [8, 8]] as const) px(x, y, '#f0f8d0')
      px(3, 2, '#386820', 5, 7)
      px(2, 3, '#386820', 7, 5)
      px(3, 3, '#68b040', 5, 5)
      px(4, 3, '#98d860', 2, 2)
      px(1, 5, '#a8d870', 1, 1)
      px(9, 5, '#a8d870', 1, 1)
      px(5, 1, '#a8d870', 1, 1)
      px(5, 9, '#a8d870', 1, 1)
    }), '#183010'),
  ),
}

/* ---------------- Icons (HUD, level-up, Pokédex) ---------------- */

const ring = (r: number, color: string, w = r * 2 + 3) =>
  paint(w, w, (px) => {
    const c = (w - 1) / 2
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - c, y - c)
      if (d <= r + 0.5 && d > r - 0.5) px(x, y, color)
    }
  })

export const SIGNATURE_ICONS: Record<SignatureMoveId, () => PixelSprite> = {
  leechSeed: () => SIG_FX.seed(),
  rapidSpin: () =>
    outlined(paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const d = Math.hypot(x - 5, y - 5)
        if (d <= 4.5) px(x, y, d > 3.5 ? '#704020' : d > 1.5 ? '#c08848' : '#f0d090')
      }
      px(5, 2, '#704020', 1, 7)
      px(2, 5, '#704020', 7, 1)
      for (const [x, y] of [[0, 2], [1, 1], [9, 9], [10, 8], [8, 0], [9, 1], [1, 10], [2, 9]] as const) px(x, y, '#a8d8f8')
    }), '#201008'),
  petalDance: () => compose(10, 10, [[outlined(SIG_FX.petal()[0]!), 0, 0], [outlined(SIG_FX.petal()[1]!), 3, 3]]),
  eruption: () => compose(10, 12, [[outlined(sprite(FLAME, FIRE_PAL), '#401008'), 0, 0], [SIG_FX.magma()[0]!, 1, 3]]),
  thrash: () => SIG_FX.anger(),
  doubleKick: () => {
    const foot = sprite(FOOT, { 1: '#803008', 2: '#f89838', 3: '#fff0c0' }, '#301008')
    return compose(14, 12, [[foot, 0, 3], [foot, 4, 0]])
  },
  mudShot: () => sprite(SPLAT, { 1: '#402810', 2: '#8a6030', 3: '#d0a868' }, '#181008'),
  woodHammer: () => SIG_FX.hammer(),
  drillPeck: () => SIG_FX.drill()[0]!,
  leafTornado: () => sprite(TORNADO, { 1: '#286820', 2: '#a8e870' }, '#103010'),
  flameCharge: () =>
    compose(14, 11, [
      [paint(5, 7, (px) => { px(0, 1, '#f8a030', 4, 1); px(1, 3, '#f8d030', 4, 1); px(0, 5, '#f8a030', 4, 1) }), 0, 2],
      [outlined(sprite(FLAME, FIRE_PAL), '#401008'), 4, 0],
    ]),
  needleArm: () => SIG_FX.spikyBall(),
  psybeam: () =>
    compose(13, 13, [[ring(5, '#f85888'), 0, 0], [ring(3.5, '#f8d030', 13), 0, 0], [ring(2, '#58c8f8', 13), 0, 0], [ring(0.6, '#ffffff', 13), 0, 0]]),
  darkestLariat: () =>
    compose(13, 13, [
      [paint(13, 13, (px) => {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 1.6
          px(Math.round(6 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 5), i % 2 ? '#f86030' : '#f8b040')
        }
      }), 0, 0],
      [SIG_FX.fist(), 4, 4],
    ]),
  sparklingAria: () =>
    compose(12, 12, [
      [paint(12, 12, (px) => {
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
          const d = Math.hypot(x - 5.5, y - 6.5)
          if (d <= 4.6 && d > 3.6) px(x, y, '#58a8f8')
          else if (d <= 3.6) px(x, y, '#c8ecff')
        }
        px(3, 4, '#ffffff', 2, 1)
        px(3, 5, '#ffffff', 1, 1)
        px(10, 0, '#f878b0', 1, 3)
        px(9, 1, '#f878b0', 3, 1)
      }), 0, 0],
    ]),
  snipeShot: () =>
    outlined(paint(13, 13, (px) => {
      for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
        const d = Math.hypot(x - 6, y - 6)
        if (d <= 5.5 && d > 4.5) px(x, y, '#4890e8')
      }
      px(6, 0, '#ffffff', 1, 4)
      px(6, 9, '#ffffff', 1, 4)
      px(0, 6, '#ffffff', 4, 1)
      px(9, 6, '#ffffff', 4, 1)
      px(5, 5, '#a8e0f8', 3, 3)
      px(6, 6, '#ffffff')
    }), '#102048'),
  flowerTrick: () => SIG_FX.flower(),
  aquaStep: () =>
    compose(13, 9, [
      [paint(5, 9, (px) => { px(0, 2, '#a8d8f8', 4, 1); px(1, 4, '#ffffff', 4, 1); px(0, 6, '#a8d8f8', 4, 1) }), 0, 0],
      [sprite(DROP, { 1: '#2050b0', 2: '#68a8f0', 3: '#e0f8ff' }, '#102048'), 4, 0],
    ]),
}
