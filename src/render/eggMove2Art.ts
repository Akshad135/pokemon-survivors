import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'

/**
 * Pixel art of the second batch of egg-family signature moves
 * (`game/eggMoves2.ts`): the sprites their effects blit (the diving bird,
 * rocks, the star…) and their move icons. Everything else they draw is code in
 * `eggMove2Fx.ts`. Only the engine is imported, so `art.ts` can spread the
 * icons in without a cycle.
 */

/** Pads string rows to one width so ragged hand-written rows stay aligned. */
const sprite = (rows: readonly string[], palette: Palette) => {
  const w = Math.max(...rows.map((r) => r.length))
  return fromStrings(rows.map((r) => r.padEnd(w, '.')), palette)
}

/** A 1px outline around the opaque pixels (icons read on any card). */
const outline = (s: PixelSprite, color = '#181818'): PixelSprite => {
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

type Plot = (x: number, y: number, color: string, w?: number, h?: number) => void

/** A small canvas painted with whole-pixel rects. */
const paint = (w: number, h: number, draw: (px: Plot) => void) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  draw((x, y, color, pw = 1, ph = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, pw, ph)
  })
  return canvas
}

/** Layers sprites on one canvas. */
const compose = (w: number, h: number, layers: ReadonlyArray<readonly [PixelSprite, number, number]>) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  for (const [s, x, y] of layers) ctx.drawImage(s, x, y)
  return canvas
}

const sq = (v: number) => v * v

const icon = (w: number, h: number, draw: (px: Plot) => void) => outline(paint(w, h, draw))

/** A bird in a dive, pointing right: wings swept back in blue flame, a gold beak. */
const BIRD = [
  '11...........',
  '.2211........',
  '..22211......',
  '...222311....',
  '..1222333111.',
  '...12233333441',
  '..1222333111.',
  '...222311....',
  '..22211......',
  '.2211........',
  '11...........',
]
/** A chunk of rock, lit from the top left. */
const ROCK = ['..1111..', '.123321.', '12333221', '12322221', '12222211', '.122211.', '..111...']
/** A bigger, rounder rock for Rock Blast's volley. */
const BOULDER = [
  '...11111...',
  '..1233321..',
  '.123333221.',
  '12333222221',
  '12332222221',
  '12222222211',
  '.122222211.',
  '..1122111..',
  '....111....',
]
/** A five-pointed star (Last Resort). */
const STAR = [
  '......1......',
  '.....121.....',
  '.....131.....',
  '....12321....',
  '1111233321111',
  '.12233333221.',
  '..123333321..',
  '...1233321...',
  '..12332321...',
  '..1231.1321..',
  '.1231...1321.',
  '.111.....111.',
]
/** Shroomish's cap: a tan mushroom with green spots. */
const MUSHROOM = [
  '...11111...',
  '..1223221..',
  '.122222321.',
  '12322222221',
  '12222232221',
  '11111111111',
  '...14441...',
  '...14441...',
  '...14441...',
  '...11111...',
]
/** A stylized fist, pointing right (Play Rough's brawl). */
const FIST = ['.1111..', '122221.', '1233321', '1233321', '122221.', '.1111..']
/** A small heart. */
const HEART = ['.11.11.', '1221221', '1222221', '.12221.', '..121..', '...1...']

export const EGG2_FX = {
  bird: lazy(() => sprite(BIRD, { 1: '#183078', 2: '#3890f0', 3: '#c8e8ff', 4: '#f8c830' })),
  birdHot: lazy(() => sprite(BIRD, { 1: '#2048a8', 2: '#88d0ff', 3: '#ffffff', 4: '#fff0a0' })),
  rock: lazy(() => outline(sprite(ROCK, { 1: '#584830', 2: '#98805c', 3: '#d0bc90' }), '#281c10')),
  rockGray: lazy(() => outline(sprite(ROCK, { 1: '#404048', 2: '#8888a0', 3: '#c8c8d8' }), '#181820')),
  boulder: lazy(() => outline(sprite(BOULDER, { 1: '#584830', 2: '#98805c', 3: '#d0bc90' }), '#281c10')),
  boulderGray: lazy(() => outline(sprite(BOULDER, { 1: '#404048', 2: '#8888a0', 3: '#c8c8d8' }), '#181820')),
  star: lazy(() => outline(sprite(STAR, { 1: '#b06808', 2: '#f8c830', 3: '#fff8d0' }), '#402000')),
  starSmall: lazy(() => sprite(['.1.', '121', '.1.'], { 1: '#f8d030', 2: '#ffffff' })),
  fist: lazy(() => outline(sprite(FIST, { 1: '#a04878', 2: '#f8a0c8', 3: '#fff0f8' }), '#381020')),
  heart: lazy(() => outline(sprite(HEART, { 1: '#c02860', 2: '#f878a8' }), '#380818')),
}

/* ---------------- Move icons ---------------- */

/** Icons of the second batch of signature moves, spread into `art.ts`'s `MOVE_ICON_ART`. */
export const EGG_MOVE_2_ICONS = {
  braveBird: () => outline(EGG2_FX.bird(), '#0c1438'),
  weatherBall: () => icon(11, 11, (px) => {
    // A ball in four weathers: sun, rain, sand and snow.
    const quads = [['#f89830', '#f8d060'], ['#4878e8', '#88b8f8'], ['#a88850', '#d8c090'], ['#88c8e8', '#e8f8ff']] as const
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const dx = x - 5
        const dy = y - 5
        if (dx * dx + dy * dy > 30) continue
        const q = quads[(dx >= 0 ? 0 : 1) + (dy >= 0 ? 2 : 0)]!
        px(x, y, dx * dx + dy * dy < 12 ? q[1] : q[0])
      }
    }
    px(3, 2, '#ffffff', 2, 1)
    px(2, 3, '#ffffff')
  }),
  accelerock: () => compose(15, 11, [
    [paint(7, 9, (px) => {
      px(0, 2, '#d0bc90', 5, 1)
      px(2, 5, '#98805c', 5, 1)
      px(1, 8, '#d0bc90', 4, 1)
    }), 0, 0],
    [EGG2_FX.rock(), 5, 1],
  ]),
  zapCannon: () => icon(12, 12, (px) => {
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const d = sq(x - 5.5) + sq(y - 5.5)
        if (d <= 30) px(x, y, d < 6 ? '#ffffff' : d < 16 ? '#fff8a0' : '#f8d030')
      }
    }
    px(2, 5, '#a86808', 3, 1); px(4, 4, '#a86808'); px(7, 6, '#a86808', 3, 1); px(7, 7, '#a86808')
  }),
  aerialAce: () => icon(12, 12, (px) => {
    for (let i = 0; i < 10; i++) {
      const x = 1 + i
      const y = Math.round(9 - Math.sin((i / 9) * Math.PI) * 6 - i * 0.4)
      px(x, y, '#ffffff', 1, 2)
      px(x, y + 2, '#78c8f8')
    }
    px(9, 1, '#ffffff'); px(8, 2, '#c8f0ff'); px(10, 2, '#c8f0ff'); px(9, 3, '#c8f0ff')
  }),
  crossPoison: () => icon(12, 12, (px) => {
    for (let i = 0; i < 12; i++) {
      px(i, i, i % 3 === 0 ? '#f0c8ff' : '#a048d8')
      px(11 - i, i, i % 3 === 1 ? '#f0c8ff' : '#7830b0')
    }
    px(5, 5, '#ffffff', 2, 2)
  }),
  bubbleBeam: () => icon(13, 11, (px) => {
    const bubble = (cx: number, cy: number, r: number) => {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = x * x + y * y
          if (d > r * r + r) continue
          px(cx + x, cy + y, d > (r - 1) * (r - 1) + r - 1 ? '#3878d8' : '#a8d8f8')
        }
      }
      px(cx - Math.max(1, r - 2), cy - Math.max(1, r - 2), '#ffffff')
    }
    bubble(8, 6, 4)
    bubble(2, 3, 2)
    bubble(3, 9, 1)
  }),
  rockBlast: () => compose(16, 14, [[EGG2_FX.rock(), 0, 5], [EGG2_FX.rock(), 6, 0], [EGG2_FX.rock(), 7, 6]]),
  cottonSpore: () => icon(14, 10, (px) => {
    const puffs = [[4, 5, 3], [8, 4, 4], [11, 6, 2], [6, 7, 2]] as const
    for (const [cx, cy, r] of puffs) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) px(cx + x, cy + y, y < -r / 2 ? '#ffffff' : '#e8e0f0')
    }
    px(2, 8, '#a8a0c0', 10, 1)
    px(7, 2, '#ffffff', 2, 1)
  }),
  wildCharge: () => icon(12, 13, (px) => {
    for (let y = 0; y < 13; y++) for (let x = 0; x < 12; x++) if (Math.abs(sq(x - 5.5) + sq(y - 6) - 28) < 6) px(x, y, '#3870d8')
    const bolt = [[7, 1], [6, 2], [5, 3], [4, 4], [4, 5], [5, 5], [6, 5], [7, 5], [6, 6], [5, 7], [4, 8], [3, 9]] as const
    for (const [x, y] of bolt) px(x, y, '#f8d030', 2, 1)
    px(6, 3, '#ffffff'); px(5, 7, '#ffffff')
  }),
  playRough: () => compose(16, 13, [
    [icon(13, 10, (px) => {
      const puffs = [[3, 5, 3], [7, 4, 4], [10, 6, 2]] as const
      for (const [cx, cy, r] of puffs) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) px(cx + x, cy + y, y < 0 ? '#fff0f8' : '#f0c0d8')
    }), 0, 3],
    [EGG2_FX.starSmall(), 3, 1],
    [EGG2_FX.heart(), 8, 0],
  ]),
  spore: () => compose(15, 14, [
    [outline(sprite(MUSHROOM, { 1: '#503018', 2: '#c8a060', 3: '#78b040', 4: '#f0e0c0' }), '#201008'), 2, 2],
    [paint(15, 4, (px) => {
      px(0, 2, '#d8f0a0'); px(3, 0, '#f8f8d0'); px(12, 1, '#d8f0a0'); px(14, 3, '#f8f8d0'); px(8, 0, '#d8f0a0')
    }), 0, 0],
  ]),
  waterfall: () => icon(11, 14, (px) => {
    px(3, 0, '#2858c8', 5, 11)
    px(4, 0, '#78b8f8', 3, 11)
    px(5, 1, '#ffffff', 1, 3); px(5, 6, '#ffffff', 1, 2)
    px(1, 10, '#a8d8f8', 9, 2)
    px(0, 12, '#78b8f8', 11, 1)
    px(2, 9, '#ffffff'); px(8, 9, '#ffffff'); px(0, 11, '#ffffff'); px(10, 11, '#ffffff')
  }),
  lastResort: () => EGG2_FX.star(),
}
