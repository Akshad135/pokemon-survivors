import { context2d, createCanvas, fromStrings, type Palette, type PixelSprite } from '../engine/pixelart'
import type { CurseId } from '../data/curses'
import type { DuoMoveId } from '../game/duoMoves'

/**
 * Pixel art of the duo moves' icons and the cursed items (`render/duoFx.ts`
 * draws the moves in the world, `art.ts` lists the icons). Round shapes are
 * painted in code on the pixel grid, the rest are string sprites. `art.ts`
 * imports this file, so it keeps its own outline helper.
 */

type Px = (x: number, y: number, color: string, w?: number, h?: number) => void

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

/** A canvas painted with `fn(px)`, where `px(x, y, color, w, h)` fills whole pixels. */
const paint = (w: number, h: number, fn: (px: Px) => void) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  fn((x, y, color, pw = 1, ph = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), pw, ph)
  })
  return canvas
}

const sprite = (rows: readonly string[], palette: Palette, outline?: string) => {
  const s = fromStrings(rows, palette)
  return outline ? outlined(s, outline) : s
}

/** A pledge column `h` px tall at `x`, shaded dark to light upward, with a bright core: the Pledges' shape. */
const column = (px: Px, x: number, bottom: number, h: number, w: number, shades: readonly string[]) => {
  for (let i = 0; i < h; i++) {
    const k = i / Math.max(1, h - 1)
    const color = shades[Math.min(shades.length - 1, Math.floor(k * shades.length))]!
    // Narrows near the top, like a burst losing breath.
    const half = Math.max(0, Math.round(((w - 1) / 2) * (1 - k * 0.6)))
    px(x - half, bottom - i, color, half * 2 + 1, 1)
  }
  px(x, bottom - h + 2, '#ffffff', 1, Math.max(1, Math.round(h * 0.55)))
}

/** A filled disc of radius `r` centered at (cx, cy), shaded by `shade(dx, dy)`. */
const disc = (px: Px, cx: number, cy: number, r: number, shade: (dx: number, dy: number) => string) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, shade(x, y))
}

const FIRE = ['#a82010', '#e85818', '#f8b030', '#fff4b0'] as const
const WATER = ['#183878', '#3868c8', '#88c0f8', '#ffffff'] as const
const GRASS = ['#184818', '#389828', '#88d050', '#e0f8a0'] as const
const RAINBOW = ['#e83838', '#f89830', '#f8e030', '#58c838', '#3888e8', '#8048d0'] as const

/** Bright-to-dark comet palettes: Fusion Flare white-hot fire, Fusion Bolt white-blue lightning. */
export const COMET_PALETTES = {
  fusionFlare: ['#ffffff', '#fff4b0', '#f8b030', '#e85818', '#a82010'],
  fusionBolt: ['#ffffff', '#e0f8ff', '#80d0f8', '#3878e0', '#183878'],
} as const

/** A comet coming down from the upper left: a round head and a tapering tail. */
const cometIcon = (pal: readonly string[]) =>
  outlined(paint(14, 14, (px) => {
    for (let i = 0; i < 9; i++) {
      const w = Math.max(1, 4 - Math.floor(i / 2.5))
      px(1 + i, 1 + i, pal[Math.min(pal.length - 1, 2 + Math.floor(i / 3))]!, w, w)
    }
    disc(px, 9, 9, 3, (dx, dy) => (dx * dx + dy * dy <= 1 ? pal[0]! : dx + dy < 0 ? pal[1]! : pal[2]!))
  }), '#181018')

export const DUO_ICONS: Record<DuoMoveId, () => PixelSprite> = {
  firePledge: () =>
    outlined(paint(14, 14, (px) => {
      column(px, 7, 11, 11, 5, FIRE)
      column(px, 2, 12, 7, 3, FIRE)
      column(px, 11, 12, 8, 3, FIRE)
      px(0, 12, FIRE[1], 14, 2)
      for (const x of [1, 4, 9, 12]) px(x, 11, FIRE[2])
    }), '#401008'),
  waterPledge: () =>
    outlined(paint(14, 14, (px) => {
      RAINBOW.forEach((color, i) => {
        const r = 7 - i * 0.7
        for (let a = 0; a <= 24; a++) {
          const t = Math.PI * (a / 24)
          px(7 - Math.cos(t) * r, 8 - Math.sin(t) * r, color)
        }
      })
      column(px, 7, 13, 9, 5, WATER)
      px(4, 13, WATER[1], 7, 1)
    }), '#0c1c40'),
  grassPledge: () =>
    outlined(paint(14, 14, (px) => {
      px(0, 11, '#506828', 14, 3)
      px(2, 12, '#788838', 4, 1)
      px(8, 12, '#788838', 5, 1)
      column(px, 7, 11, 11, 5, GRASS)
      // Leaves off the vine.
      px(2, 4, GRASS[2], 3, 1)
      px(3, 5, GRASS[1], 2, 1)
      px(10, 6, GRASS[2], 3, 1)
      px(10, 7, GRASS[1], 2, 1)
    }), '#103010'),
  fusionFlare: () => cometIcon(COMET_PALETTES.fusionFlare),
  fusionBolt: () => cometIcon(COMET_PALETTES.fusionBolt),
  ionDeluge: () =>
    outlined(paint(14, 13, (px) => {
      for (let y = -2; y <= 2; y++) {
        const half = Math.round(6.5 * Math.sqrt(1 - (y * y) / 6.25))
        px(7 - half, 10 + y, y < 0 ? WATER[2] : WATER[1], half * 2, 1)
      }
      px(3, 9, '#ffffff', 3, 1)
      const bolt = [[8, 0], [7, 1], [6, 2], [5, 3], [6, 4], [7, 4], [6, 5], [5, 6], [4, 7], [5, 8]] as const
      for (const [x, y] of bolt) {
        px(x, y, '#f8e030', 2, 1)
        px(x, y, '#fff8b0')
      }
    }), '#102048'),
  freezeDry: () =>
    outlined(paint(13, 14, (px) => {
      for (let y = 0; y < 14; y++) {
        const half = y < 6 ? Math.floor(y * 0.9) : Math.round(5.5 * Math.sqrt(Math.max(0, 1 - ((y - 8.5) * (y - 8.5)) / 30)))
        if (half > 0 || y < 6) px(6 - half, y, y < 7 ? '#a8d8f8' : '#68a8e8', half * 2 + 1, 1)
      }
      // A snowflake frozen inside the drop.
      for (const [x, y] of [[6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [4, 8], [5, 8], [7, 8], [8, 8], [4, 6], [8, 6], [4, 10], [8, 10], [5, 7], [7, 7], [5, 9], [7, 9]] as const) {
        px(x, y, '#ffffff')
      }
    }), '#183870'),
  nightmare: () =>
    sprite(
      [
        '..11111..',
        '.1222221.',
        '122222221',
        '123322331',
        '124322431',
        '122252221',
        '.1222221.',
        '..12121..',
        '..1.6.1..',
        '....6....',
      ],
      { 1: '#281038', 2: '#9878c8', 3: '#181020', 4: '#a8f060', 5: '#481858', 6: '#a8f060' },
      '#100818',
    ),
}

/* ---------------- Cursed items ---------------- */

/** An orb with a shine and a swirl: Life Orb and Flame Orb. */
const orb = (dark: string, mid: string, light: string, swirl: string) =>
  paint(11, 11, (px) => {
    disc(px, 5, 5, 5, (dx, dy) => {
      const d = Math.hypot(dx + 1.5, dy + 1.5)
      if (d < 1.2) return '#ffffff'
      if (Math.abs(Math.atan2(dy, dx) * 2 + Math.hypot(dx, dy) * 0.9) % 2.4 < 0.45) return swirl
      return d < 3.5 ? light : Math.hypot(dx, dy) > 4.2 ? dark : mid
    })
  })

const CURSE_ART: Record<CurseId, () => PixelSprite> = {
  lifeOrb: () => orb('#401030', '#a02858', '#e85890', '#ffb8d8'),
  flameOrb: () => orb('#601808', '#d84818', '#f8a030', '#fff0a0'),
  choiceBand: () =>
    paint(13, 11, (px) => {
      // A headband seen from the front, its knot's tails trailing to the right.
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2
        const x = 5.5 + Math.cos(t) * 5
        const y = 4 + Math.sin(t) * 2.4
        px(x, y, Math.sin(t) > 0 ? '#e83838' : '#a01820', 1, 2)
      }
      px(3, 4, '#f8f0d0', 2, 1)
      px(10, 5, '#e83838', 2, 2)
      px(11, 7, '#c02828', 2, 1)
      px(12, 8, '#a01820', 1, 2)
      px(10, 8, '#c02828', 1, 2)
    }),
  ironBall: () =>
    paint(13, 13, (px) => {
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2
        px(6 + Math.cos(t) * 5.6, 6 + Math.sin(t) * 5.6, '#58606a')
      }
      disc(px, 6, 6, 4, (dx, dy) => {
        const d = Math.hypot(dx + 1.5, dy + 1.5)
        return d < 1 ? '#f0f4f8' : d < 2.6 ? '#a8b0b8' : Math.hypot(dx, dy) > 3.3 ? '#30343c' : '#6a727c'
      })
    }),
}

/**
 * The cursed items' purple frame: dark violet inside, a two-tone rim and a
 * spark at two corners, so a cursed item never reads as a regular held item.
 */
const FRAME = 18
const curseFrame = () =>
  paint(FRAME, FRAME, (px) => {
    px(1, 0, '#c070f8', FRAME - 2, 1)
    px(1, FRAME - 1, '#401060', FRAME - 2, 1)
    px(0, 1, '#a050e0', 1, FRAME - 2)
    px(FRAME - 1, 1, '#601890', 1, FRAME - 2)
    px(1, 1, '#2a0840', FRAME - 2, FRAME - 2)
    px(2, 2, '#3a1058', FRAME - 4, FRAME - 4)
    px(1, 1, '#e0b0ff')
    px(FRAME - 2, FRAME - 2, '#e0b0ff')
  })

/** A cursed item's icon: the item, outlined, in the purple frame. */
export const cursedIcon = (id: CurseId) => {
  const item = outlined(CURSE_ART[id](), '#181018')
  const canvas = curseFrame()
  context2d(canvas).drawImage(item, Math.floor((FRAME - item.width) / 2), Math.floor((FRAME - item.height) / 2))
  return canvas
}
