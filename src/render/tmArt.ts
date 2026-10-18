import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'
import type { TmMoveId } from '../game/tmMoves'

/**
 * Pixel art of the TM moves (`render/tmFx.ts` draws them, `art.ts` lists the
 * icons), the TM disc and the Move Tutor's tent. String sprites, plus a few
 * round shapes painted in code on the same pixel grid; all built lazily (the
 * DOM canvas only exists at render time). `art.ts` imports this file, so it
 * keeps its own outline helper instead of importing `art.ts` back.
 */

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

type Px = (x: number, y: number, color: string, w?: number, h?: number) => void

/** A canvas painted with `fn(px)`, where `px(x, y, color, w, h)` fills whole pixels. */
const paint = (w: number, h: number, fn: (px: Px) => void) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  fn((x, y, color, pw = 1, ph = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, pw, ph)
  })
  return canvas
}

const compose = (w: number, h: number, layers: ReadonlyArray<readonly [PixelSprite, number, number]>) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  for (const [s, x, y] of layers) ctx.drawImage(s, x, y)
  return canvas
}

/* ---------------- Rocks ---------------- */

const STONE = { rim: '#2a2218', base: '#a08868', light: '#dccca4', shade: '#665040', crack: '#463626' } as const
const METEOR = { rim: '#201828', base: '#7a6a88', light: '#d8c8e8', shade: '#40304e', crack: '#f87830' } as const

/**
 * A boulder `w`×`h` px: a lumpy outline (`bumps` push the edge in, around the
 * circle), lit from the top right, with a crack. Painted in code so every
 * size stays on the pixel grid.
 */
const boulder = (w: number, h: number, bumps: readonly number[], pal: typeof STONE | typeof METEOR, rune = false) =>
  outlined(
    paint(w, h, (px) => {
      const cx = (w - 1) / 2
      const cy = (h - 1) / 2
      const inside = (x: number, y: number) => {
        const nx = (x - cx) / (cx + 0.5)
        const ny = (y - cy) / (cy + 0.5)
        const angle = Math.atan2(ny, nx)
        const bump = bumps[Math.floor(((angle + Math.PI) / (Math.PI * 2)) * bumps.length) % bumps.length]!
        return Math.hypot(nx, ny) <= 1 - bump * 0.14
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!inside(x, y)) continue
          const nx = (x - cx) / cx
          const ny = (y - cy) / cy
          const lit = nx * 0.6 - ny * 0.8
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
          px(x, y, edge && lit < 0.2 ? pal.rim : lit > 0.55 ? pal.light : lit < -0.45 ? pal.shade : pal.base)
        }
      }
      // A crack across the face.
      const k = Math.round(cx)
      for (let i = 0; i < Math.round(h * 0.35); i++) px(k - 1 + (i % 2), Math.round(cy - 1) + i, pal.crack)
      if (rune) {
        const ry = Math.round(cy)
        for (const [dx, dy] of [[0, -2], [-1, -1], [1, -1], [0, 0], [-2, 0], [2, 0], [0, 1], [-1, 2], [1, 2]] as const) px(k + dx, ry + dy, '#f8d870')
        px(k, ry, '#fff8d0')
      }
    }),
    '#181008',
  )

/* ---------------- Fangs, shards, letters ---------------- */

/** Thunder Fang's upper jaw (fangs pointing down); the lower one is the rows reversed. 1 rim, 2 fang, 3 light. */
const JAW = ['111111111111111', '123333333333321', '122222222222221', '.12221.1.12221.', '.1221.....1221.', '..121.....121..', '...1.......1...']
const FANG: Palette = { 1: '#3a2c00', 2: '#f8d030', 3: '#fff8c8' }
/** A steel shard pointing right: 1 rim, 2 steel, 3 shine. */
const SHARD = ['11....', '1331..', '123311', '122221', '1111..']
const STEEL: Palette = { 1: '#283040', 2: '#8890a8', 3: '#e8eef8' }
/** A Z of the yawn. */
const ZED = ['1111', '..1.', '.1..', '1111']

/* ---------------- The TM disc ---------------- */

/**
 * A TM disc of the move's type color: a shiny CD with a dark hub and a white
 * glint, and a gold rim for a legendary one. Painted at 11×11.
 */
const disc = (color: string, gold: boolean) =>
  outlined(
    paint(11, 11, (px) => {
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 11; x++) {
          const d = Math.hypot(x - 5, y - 5)
          if (d > 5.4) continue
          if (d > 4.5) px(x, y, gold ? '#f8d030' : '#e8e8f0')
          else if (d > 1.9) px(x, y, color)
          else if (d > 1.1) px(x, y, '#c8c8d8')
          else px(x, y, '#181820')
        }
      }
      // The glint: an arc of light across the top left, and a sparkle.
      px(3, 2, '#ffffff', 2, 1)
      px(2, 3, '#ffffff', 1, 2)
      px(4, 3, 'rgba(255,255,255,0.6)')
      px(7, 7, 'rgba(255,255,255,0.45)', 1, 1)
      if (gold) px(8, 1, '#fff8c0')
    }),
    gold ? '#5a3a00' : '#181828',
  )

const discs = new Map<string, PixelSprite>()

/** The TM disc sprite of a type color (cached per color and rim). */
export const tmDisc = (color: string, gold = false) => {
  const key = `${color}:${gold}`
  let s = discs.get(key)
  if (!s) {
    s = disc(color, gold)
    discs.set(key, s)
  }
  return s
}

/* ---------------- The Move Tutor ---------------- */

/** The tutor: a hat, a white beard, a blue robe and a TM in hand. */
const TUTOR = [
  '...111...', '..12221..', '.1222221.', '111111111', '.1333331.', '.1343431.', '.1355531.', '..15551..', '.1665661.',
  '166666661', '167666661', '166666661', '.16...61.', '.11...11.',
]
const TUTOR_PAL: Palette = { 1: '#201810', 2: '#7a4a28', 3: '#f0c8a0', 4: '#201810', 5: '#f8f8f8', 6: '#3858b8', 7: '#f8d030' }

/** The tutor's striped tent with its flag (32×28): a striped roof, walls, the open flap and a TM sign over the door. */
const tent = () =>
  outlined(
    paint(32, 28, (px) => {
      // Flag on a pole.
      px(16, 0, '#583818', 1, 7)
      px(17, 0, '#e84040', 5, 1)
      px(17, 1, '#e84040', 4, 1)
      px(17, 2, '#f87878', 3, 1)
      px(17, 3, '#e84040', 1, 1)
      // Roof: a triangle in red and cream stripes, darker on the right.
      for (let y = 6; y < 16; y++) {
        const half = Math.round(((y - 6) / 9) * 15.5)
        for (let x = 16 - half; x <= 15 + half; x++) {
          const stripe = Math.floor((x - 16 + 32) / 4) % 2 === 0
          const shade = x > 16 + half * 0.4
          px(x, y, stripe ? (shade ? '#b82828' : '#e04040') : shade ? '#d8c8a8' : '#f8ecd0')
        }
      }
      // A scalloped hem along the roof's edge.
      for (let x = 0; x < 32; x++) px(x, 16, Math.floor(x / 4) % 2 === 0 ? '#a82828' : '#c8b898')
      for (let x = 1; x < 32; x += 4) px(x, 17, Math.floor(x / 4) % 2 === 0 ? '#a82828' : '#c8b898', 2, 1)
      // Walls, shaded on the right.
      for (let y = 17; y < 28; y++) {
        for (let x = 1; x < 31; x++) {
          if (y === 17 && (x - 1) % 4 < 2) continue
          const stripe = Math.floor((x + 32) / 4) % 2 === 0
          px(x, y, stripe ? (x > 22 ? '#a82828' : '#c83030') : x > 22 ? '#c8bca0' : '#e8dcc0')
        }
      }
      // The open flap: a dark doorway with the curtain tied back.
      for (let y = 18; y < 28; y++) {
        const half = Math.round(((y - 18) / 9) * 5)
        px(16 - half, y, '#281810', half * 2 + 1, 1)
        if (half > 0) {
          px(15 - half, y, '#f8ecd0')
          px(17 + half, y, '#f8ecd0')
        }
      }
      // The sign: a little TM disc over the door.
      for (let y = 10; y < 15; y++) for (let x = 13; x < 20; x++) {
        const d = Math.hypot(x - 16, y - 12)
        if (d <= 2.6) px(x, y, d > 1.8 ? '#e8e8f0' : d > 0.8 ? '#58a0f8' : '#181820')
      }
      px(15, 11, '#ffffff')
    }),
    '#201010',
  )

export const TM_FX = {
  rocks: lazy(() => [boulder(15, 12, [0, 1, 0, 2, 0, 0, 1, 0, 2, 1], STONE), boulder(12, 10, [1, 0, 0, 2, 1, 0, 0, 1], STONE), boulder(9, 8, [0, 2, 0, 1, 0, 1], STONE)]),
  meteor: lazy(() => boulder(12, 11, [0, 1, 0, 0, 2, 0, 1, 0], METEOR, true)),
  jawTop: lazy(() => sprite(JAW, FANG)),
  jawBottom: lazy(() => sprite([...JAW].reverse(), FANG)),
  shard: lazy(() => sprite(SHARD, STEEL, '#101418')),
  zed: lazy(() => sprite(ZED, { 1: '#f0f0ff' }, '#383060')),
  tutor: lazy(() => sprite(TUTOR, TUTOR_PAL)),
  tent: lazy(tent),
}

/* ---------------- Icons ---------------- */

export const TM_ICONS: Record<TmMoveId, () => PixelSprite> = {
  rockSlide: () => compose(16, 16, [[TM_FX.rocks()[2]!, 0, 0], [TM_FX.rocks()[1]!, 4, 5]]),
  yawn: () =>
    outlined(
      paint(13, 12, (px) => {
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
          const d = Math.hypot(x - 6.5, y - 6)
          if (d <= 5.6) px(x, y, d > 4.6 ? '#b8b0f0' : 'rgba(216,208,255,0.55)')
        }
        px(4, 3, '#ffffff', 2, 1)
        px(3, 4, '#ffffff', 1, 1)
        // A small Z inside.
        px(6, 5, '#504890', 3, 1)
        px(7, 6, '#504890', 1, 1)
        px(6, 7, '#504890', 3, 1)
        px(11, 0, '#f0f0ff', 2, 1)
        px(12, 1, '#f0f0ff', 1, 1)
        px(11, 2, '#f0f0ff', 2, 1)
      }),
      '#302860',
    ),
  iceBeam: () =>
    outlined(
      paint(14, 9, (px) => {
        px(0, 3, '#78c8f0', 9, 3)
        px(0, 4, '#ffffff', 10, 1)
        for (const [x, y] of [[10, 4], [11, 3], [11, 5], [12, 4], [11, 4], [10, 2], [10, 6], [13, 4], [9, 1], [9, 7]] as const) px(x, y, '#d8f4ff')
        px(11, 4, '#ffffff')
        px(12, 1, '#ffffff')
        px(3, 1, '#d8f4ff')
        px(6, 7, '#d8f4ff')
      }),
      '#183850',
    ),
  discharge: () =>
    outlined(
      paint(13, 13, (px) => {
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2
          if (i % 5 === 4) continue
          px(Math.round(6 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 5), '#f8d030')
        }
        // A bolt through the middle.
        for (const [x, y] of [[7, 2], [6, 3], [6, 4], [5, 5], [6, 6], [7, 6], [6, 7], [6, 8], [5, 9], [5, 10]] as const) px(x, y, '#ffffff')
        for (const [x, y] of [[8, 2], [7, 3], [7, 4], [8, 6], [7, 7], [7, 8], [6, 9]] as const) px(x, y, '#f8e070')
      }),
      '#403000',
    ),
  heatWave: () =>
    outlined(
      paint(12, 13, (px) => {
        for (let y = 0; y < 13; y++) {
          const bend = Math.round(Math.sin(((y - 6) / 6) * 1.3) * -3 + 3 - Math.abs(y - 6) * 0.2)
          const x = 3 + Math.round(Math.abs(y - 6) * 0.5) - bend + 3
          px(x, y, '#c02010')
          px(x + 1, y, '#f87828')
          px(x + 2, y, '#f8c040')
          if (y > 2 && y < 10) px(x + 3, y, '#fff4c0')
        }
        for (const [x, y] of [[1, 3], [0, 6], [1, 9]] as const) px(x, y, '#f8a030', 2, 1)
      }),
      '#401008',
    ),
  thunderFang: () => compose(17, 17, [[outlined(TM_FX.jawTop(), '#403000'), 0, 0], [outlined(TM_FX.jawBottom(), '#403000'), 0, 8]]),
  lavaPlume: () =>
    outlined(
      paint(13, 13, (px) => {
        // A cone of rock with lava jetting out of it.
        for (let y = 7; y < 13; y++) {
          const half = Math.round((y - 7) * 1.1) + 1
          px(6 - half, y, '#583828', half * 2 + 1, 1)
        }
        px(5, 7, '#e85818', 3, 1)
        px(4, 12, '#f8a030', 5, 1)
        for (let y = 1; y < 8; y++) px(6 - (y % 2), y, y < 3 ? '#fff4b0' : '#f8b030', 2, 1)
        for (const [x, y, c] of [[2, 2, '#f87828'], [10, 3, '#f8b030'], [9, 0, '#f87828'], [3, 5, '#f8d030']] as const) px(x, y, c, 1, 1)
      }),
      '#300c04',
    ),
  auroraBeam: () =>
    outlined(
      paint(14, 9, (px) => {
        const bands = ['#f85888', '#f8a030', '#f8e030', '#78d850', '#58c8f8', '#a070f8']
        for (let x = 0; x < 14; x++) {
          const y0 = Math.round(1 + Math.sin(x * 0.55) * 1.2)
          bands.forEach((c, i) => px(x, y0 + i, c))
        }
      }),
      '#202040',
    ),
  meteorBeam: () =>
    compose(16, 15, [
      [
        paint(16, 15, (px) => {
          for (let i = 0; i < 20; i++) {
            const ang = (i / 20) * Math.PI * 2
            if (i % 2) px(Math.round(7.5 + Math.cos(ang) * 7.5), Math.round(7 + Math.sin(ang) * 7), '#f8d870')
          }
        }),
        0,
        0,
      ],
      [TM_FX.meteor(), 1, 1],
    ]),
  icyWind: () =>
    outlined(
      paint(13, 11, (px) => {
        for (let x = 0; x < 9; x++) px(x, 2, '#d8f4ff')
        px(9, 1, '#d8f4ff', 2, 1)
        px(11, 2, '#d8f4ff', 1, 2)
        px(9, 4, '#d8f4ff', 2, 1)
        for (let x = 2; x < 12; x++) px(x, 6, '#ffffff')
        px(12, 7, '#ffffff', 1, 2)
        px(10, 9, '#ffffff', 2, 1)
        for (const [x, y] of [[1, 8], [0, 9], [2, 9], [1, 10], [1, 9]] as const) px(x, y, '#98d8f8')
      }),
      '#305878',
    ),
  ironHead: () =>
    outlined(
      paint(12, 11, (px) => {
        // A steel helmet seen from the side, ramming right.
        for (let y = 0; y < 11; y++) for (let x = 0; x < 12; x++) {
          const d = Math.hypot((x - 5) / 1.15, y - 6)
          if (d <= 5.2 && y <= 8) px(x, y, d > 4.2 ? '#485068' : x + y < 8 ? '#e8eef8' : '#9098b0')
        }
        px(1, 8, '#485068', 10, 2)
        px(2, 8, '#c8d0e0', 8, 1)
        px(3, 2, '#ffffff', 2, 1)
        px(11, 4, '#f8f8ff', 1, 3)
      }),
      '#141820',
    ),
  psystrike: () =>
    outlined(
      paint(13, 13, (px) => {
        for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
          const d = Math.hypot(x - 6, y - 6)
          if (d <= 4.5) px(x, y, d > 3.3 ? '#a03078' : d > 1.6 ? '#f878c0' : '#ffffff')
        }
        for (const [x, y] of [[6, 0], [12, 6], [6, 12], [0, 6], [2, 2], [10, 2], [2, 10], [10, 10]] as const) px(x, y, '#f8b0e0')
      }),
      '#300820',
    ),
}
