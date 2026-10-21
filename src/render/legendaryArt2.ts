import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'
import type { LegendaryMove2Id } from '../game/legendaryMoves2'
import { medallion } from './legendaryArt'

/**
 * Pixel art of the second batch of legendary moves (`render/legendaryFx2.ts`
 * draws them, `art.ts` lists the icons): string sprites and emblems painted
 * in code, on the same gold medallion as the first batch.
 */

type Px = (x: number, y: number, color: string, w?: number, h?: number) => void

const paint = (w: number, h: number, fn: (px: Px) => void) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  fn((x, y, color, pw = 1, ph = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, pw, ph)
  })
  return canvas
}

const sprite = (rows: readonly string[], palette: Palette) => fromStrings(rows, palette)

/* ---------------- Sprites ---------------- */

/** Snowscape's crystal, a six-pointed flake: 1 deep ice, 2 ice, 3 light, 4 white. */
const CRYSTAL = [
  '...1.1...',
  '1..121..1',
  '.1.232.1.',
  '..13431..',
  '123444321',
  '..13431..',
  '.1.232.1.',
  '1..121..1',
  '...1.1...',
]
/** Overheat's blazing feather pointing right: 1 deep red, 2 orange, 3 gold, 4 white-hot. */
const FEATHER = ['..11111.....', '.1222221111.', '123333322221', '.1222221111.', '..11111.....']
/** Rock Wrecker's boulder, lit from the top left: 1 dark, 2 stone, 3 light, 4 a crack. */
const BOULDER = [
  '....11111....',
  '..112223311..',
  '.12222333331.',
  '.12222233331.',
  '1222242223331',
  '1222224222331',
  '1222222422231',
  '1122222242221',
  '1122222222221',
  '.11222222221.',
  '.11122222211.',
  '..111122111..',
  '....11111....',
]

export const LEGEND_FX_2 = {
  crystal: lazy(() => sprite(CRYSTAL, { 1: '#4878c8', 2: '#88c8f0', 3: '#c8f0ff', 4: '#ffffff' })),
  feather: lazy(() => [
    sprite(FEATHER, { 1: '#a01810', 2: '#f06018', 3: '#f8c030', 4: '#fff8d0' }),
    sprite(FEATHER, { 1: '#c03010', 2: '#f89030', 3: '#f8e070', 4: '#ffffff' }),
  ]),
  boulder: lazy(() => sprite(BOULDER, { 1: '#4a3420', 2: '#8a6a48', 3: '#c8a878', 4: '#2a1c10' })),
}

/* ---------------- Icons (HUD, level-up, Pokédex) ---------------- */

export const LEGENDARY_ICONS_2: Record<LegendaryMove2Id, () => PixelSprite> = {
  snowscape: () => medallion(LEGEND_FX_2.crystal(), '#102040'),
  electricTerrain: () =>
    medallion(paint(11, 11, (px) => {
      for (let i = 0; i < 11; i += 2) {
        px(i, 8, '#c89000', 1, 1)
        px(i + 1, 9, '#f8e030', 1, 1)
      }
      px(5, 0, '#ffffff', 2, 1)
      px(4, 1, '#f8e030', 2, 2)
      px(3, 3, '#f8e030', 4, 1)
      px(5, 4, '#f8e030', 2, 2)
      px(4, 6, '#ffffff', 2, 2)
      px(3, 10, '#f8e030', 5, 1)
    }), '#282008'),
  overheat: () => medallion(LEGEND_FX_2.feather()[0]!, '#381008'),
  thunderclap: () =>
    medallion(paint(11, 11, (px) => {
      const pts = [[0, 1], [3, 4], [2, 6], [6, 7], [5, 9], [10, 10]] as const
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i]!
        const [x1, y1] = pts[i + 1]!
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
        for (let k = 0; k <= n; k++) px(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), k % 2 ? '#f8e030' : '#ffffff')
      }
      px(8, 1, '#a868e8', 3, 2)
      px(9, 0, '#d8b8f8')
    }), '#201030'),
  burningBulwark: () =>
    medallion(paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const d = Math.hypot(x - 5, y - 5)
        if (d <= 5.5 && d > 3.6) px(x, y, (x + y) % 3 === 0 ? '#f87020' : '#583828')
      }
      px(4, 3, '#f8c030', 3, 5)
      px(5, 2, '#fff4b0', 1, 3)
    }), '#301008'),
  aquaRing: () =>
    medallion(paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const d = Math.hypot(x - 5, y - 5)
        if (d <= 5.5 && d > 4.2) px(x, y, x < 5 ? '#a8f0f8' : '#4890e0')
      }
      px(4, 3, '#ffffff', 3, 1)
      px(3, 4, '#a868e8', 5, 3)
      px(4, 5, '#ffffff', 3, 1)
      px(5, 7, '#a868e8')
    }), '#081838'),
  rockWrecker: () => medallion(LEGEND_FX_2.boulder(), '#281808'),
  glaciate: () =>
    medallion(paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const dx = x - 5
        const dy = (y - 9) * 1.3
        const d = Math.hypot(dx, dy)
        if (y <= 9 && d <= 6 && d > 4.8) px(x, y, '#c8f0ff')
        else if (y <= 9 && d <= 4.8) px(x, y, (x + y) % 4 === 0 ? '#ffffff' : '#78b8e8')
      }
      px(0, 10, '#a8d8f8', 11, 1)
      // Regice's dots, in a line across the dome.
      for (const x of [2, 4, 6, 8]) px(x, 6, '#f8e070')
    }), '#102040'),
  metalBurst: () =>
    medallion(paint(11, 11, (px) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        px(Math.round(5 + Math.cos(a) * 4.5), Math.round(5 + Math.sin(a) * 4.5), '#e8f0f8')
        px(Math.round(5 + Math.cos(a) * 3), Math.round(5 + Math.sin(a) * 3), '#8898b0')
      }
      px(4, 4, '#ffffff', 3, 3)
      px(5, 5, '#f84040')
    }), '#202838'),
  telekinesis: () =>
    medallion(paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const d = Math.hypot(x - 5, (y - 5) * 1.4)
        if (d <= 5.5 && d > 4.4) px(x, y, '#b050d8')
      }
      px(4, 3, '#f0c8ff', 3, 3)
      px(5, 4, '#ffffff')
      for (const x of [2, 5, 8]) px(x, 9, '#e0a8f8', 1, 2)
    }), '#200c28'),
  judgment: () =>
    medallion(paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const d = Math.hypot(x - 5, y - 5)
        if (d <= 5.5 && d > 4.4) px(x, y, '#f8d030')
      }
      const gems = ['#f83838', '#48a8f0', '#58c858', '#a868e8'] as const
      gems.forEach((c, i) => {
        const a = (i / gems.length) * Math.PI * 2 + 0.4
        px(Math.round(5 + Math.cos(a) * 4.5), Math.round(5 + Math.sin(a) * 4.5), c)
      })
      px(4, 4, '#ffffff', 3, 3)
      px(5, 3, '#fff4b0', 1, 5)
      px(3, 5, '#fff4b0', 5, 1)
    }), '#28203c'),
}
