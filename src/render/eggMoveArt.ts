import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'

/**
 * Pixel art of the egg families' signature moves (`game/eggMoves.ts`): the few
 * sprites their effects blit (bones, the sacred blade, meteor fists…) and their
 * move icons. Everything else they draw is code in `eggMoveFx.ts`. Only the
 * engine is imported, so `art.ts` can spread the icons in without a cycle.
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

const BONE = ['.11......11.', '122111111221', '.1222222221.', '.1233333321.', '122111111221', '.11......11.']
/** Pointing right: gold hilt and guard, a white blade with a pale blue edge. */
const BLADE = [
  '.5.....1111111111111..',
  '454...122222222222221.',
  '4544412333333333333321',
  '454...122222222222221.',
  '.5.....1111111111111..',
]
/** Togepi's waggling finger, pointing up. */
const FINGER = ['.11....', '1221...', '1221...', '1221...', '122111.', '1222221', '1222221', '1222221', '.11111.']
/** Smeargle's tail, pointing up: a wooden handle and the paint-soaked tip. */
const BRUSH = ['..33..', '.3443.', '.3443.', '.3333.', '..33..', '..11..', '..12..', '..12..', '..12..', '..12..', '..11..']
/** A curse nail, point down. */
const NAIL = ['11111', '12221', '.121.', '.121.', '.121.', '.121.', '.121.', '..1..']
const MOUND = [
  '.....111111.....',
  '...1122332211...',
  '..122333443221..',
  '.12233343333221.',
  '1222333333332221',
  '1111111111111111',
]
/** A fist pointing right, like `art.ts`'s, for the meteor's steel. */
const FIST = ['..1111..', '.122221.', '12333311', '12333331', '12333321', '.1222221', '..11111.']
/** Dream Eater's upper maw; the lower one is the rows reversed. */
const MAW = ['..1111111..', '.122222221.', '12222222221', '13.3.3.3.31']

export const EGG_FX = {
  bone: lazy(() => sprite(BONE, { 1: '#504030', 2: '#f8f0d8', 3: '#c8b898' })),
  blade: lazy(() => sprite(BLADE, { 1: '#3858a0', 2: '#c8e0ff', 3: '#ffffff', 4: '#a87020', 5: '#f8d870' })),
  bladeGlow: lazy(() => sprite(BLADE, { 1: '#f8d870', 2: '#fff8d0', 3: '#ffffff', 4: '#f8d870', 5: '#ffffff' })),
  finger: lazy(() => outline(sprite(FINGER, { 1: '#806040', 2: '#f8e8c8' }), '#382818')),
  brush: lazy(() => outline(sprite(BRUSH, { 1: '#5a3a20', 2: '#c89058', 3: '#3a8a28', 4: '#78d058' }), '#182810')),
  nail: lazy(() => outline(sprite(NAIL, { 1: '#281838', 2: '#c8b8e0' }), '#a070d8')),
  mound: lazy(() => sprite(MOUND, { 1: '#4a2c14', 2: '#8a5a2c', 3: '#b88848', 4: '#e0c080' })),
  meteorFist: lazy(() => outline(sprite(FIST, { 1: '#283850', 2: '#7890b8', 3: '#d8e8f8' }), '#101828')),
  meteorFistHot: lazy(() => outline(sprite(FIST, { 1: '#704010', 2: '#d8a040', 3: '#fff0b0' }), '#301808')),
  punchFist: lazy(() => outline(sprite(FIST, { 1: '#703010', 2: '#e07030', 3: '#f8c890' }), '#281008')),
  mawTop: lazy(() => sprite(MAW, { 1: '#382058', 2: '#a070d8', 3: '#ffffff' })),
  mawBottom: lazy(() => sprite([...MAW].reverse(), { 1: '#382058', 2: '#a070d8', 3: '#ffffff' })),
}

/* ---------------- Move icons ---------------- */

/** Layers sprites on one canvas. */
const compose = (w: number, h: number, layers: ReadonlyArray<readonly [PixelSprite, number, number]>) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  for (const [s, x, y] of layers) ctx.drawImage(s, x, y)
  return canvas
}

const icon = (w: number, h: number, draw: (px: Plot) => void) => outline(paint(w, h, draw))

/** Icons of the signature moves, spread into `art.ts`'s `MOVE_ICON_ART`. */
export const EGG_MOVE_ICONS = {
  dreamEater: () => outline(paint(11, 11, (px) => {
    px(1, 0, '#382058', 9, 1)
    px(0, 1, '#a070d8', 11, 3)
    px(1, 4, '#ffffff'); px(4, 4, '#ffffff'); px(6, 4, '#ffffff'); px(9, 4, '#ffffff')
    px(1, 6, '#ffffff'); px(4, 6, '#ffffff'); px(6, 6, '#ffffff'); px(9, 6, '#ffffff')
    px(0, 7, '#a070d8', 11, 3)
    px(1, 10, '#382058', 9, 1)
    px(5, 5, '#f8a0d0')
  })),
  forcePalm: () => icon(11, 11, (px) => {
    px(2, 5, '#3868c8', 6, 5)
    px(3, 6, '#78b8f8', 4, 3)
    for (let i = 0; i < 4; i++) px(2 + i * 2, 1 + (i === 0 || i === 3 ? 1 : 0), '#78b8f8', 1, 4)
    px(8, 5, '#78b8f8', 2, 1)
    px(9, 4, '#78b8f8', 1, 1)
    px(4, 7, '#ffffff', 2, 1)
  }),
  dig: () => icon(16, 10, (px) => {
    px(2, 0, '#e0c080'); px(13, 1, '#b88848'); px(7, 0, '#8a5a2c')
    px(5, 4, '#4a2c14', 6, 1)
    px(3, 5, '#8a5a2c', 10, 1)
    px(2, 6, '#b88848', 12, 2)
    px(6, 6, '#e0c080', 3, 1)
    px(1, 8, '#8a5a2c', 14, 1)
    px(0, 9, '#4a2c14', 16, 1)
  }),
  twister: () => icon(11, 12, (px) => {
    const rows = [[0, 11], [1, 9], [2, 7], [3, 6], [3, 5], [4, 4], [4, 3], [5, 2]] as const
    rows.forEach(([x, w], i) => {
      px(x, i + 1, i % 2 ? '#48c8b8' : '#a070f8', w, 1)
      px(x + (i % 3), i + 1, '#e8f8ff')
    })
    px(5, 10, '#7038f8', 1, 2)
  }),
  sandTomb: () => icon(12, 10, (px) => {
    for (let i = 0; i < 18; i++) {
      const a = i * 0.7
      const r = 1 + i * 0.28
      px(Math.round(6 + Math.cos(a) * r), Math.round(5 + Math.sin(a) * r * 0.75), i % 3 ? '#d8b070' : '#8a6030')
    }
    px(5, 4, '#fff0c0', 2, 2)
  }),
  meteorMash: () => compose(14, 13, [[paint(14, 13, (px) => {
    px(0, 0, '#f8d870', 2, 1); px(1, 1, '#f8a030', 2, 1); px(2, 2, '#f8d870', 2, 1); px(3, 3, '#f8a030', 2, 1)
    px(4, 0, '#f8a030'); px(0, 4, '#f8a030')
  }), 0, 0], [EGG_FX.meteorFist(), 4, 4]]),
  zenHeadbutt: () => icon(12, 11, (px) => {
    for (let i = 0; i < 9; i++) {
      const a = -1.3 + (i / 8) * 2.6
      px(Math.round(5 + Math.cos(a) * 5), Math.round(5 + Math.sin(a) * 5), '#f85888', 2, 1)
      px(Math.round(5 + Math.cos(a) * 3), Math.round(5 + Math.sin(a) * 3), '#ffd0e8')
    }
    px(1, 4, '#ffffff', 1, 3); px(0, 5, '#ffffff', 3, 1)
  }),
  foulPlay: () => icon(11, 11, (px) => {
    for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) px(1 + k * 3 + Math.floor(i / 3), 1 + i, i < 2 || i > 6 ? '#583878' : '#a070d8')
    px(8, 1, '#f83848', 2, 1)
  }),
  bodySlam: () => icon(13, 11, (px) => {
    px(3, 0, '#2c6070', 7, 1)
    px(2, 1, '#3888a0', 9, 4)
    px(3, 2, '#f0e0b8', 7, 3)
    px(5, 5, '#3888a0', 3, 1)
    px(0, 8, '#a08048', 13, 1)
    px(1, 9, '#d8c080', 3, 1); px(9, 9, '#d8c080', 3, 1)
    px(1, 6, '#ffffff'); px(11, 6, '#ffffff'); px(6, 7, '#ffffff')
  }),
  dynamicPunch: () => compose(14, 13, [[paint(14, 13, (px) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      for (let d = 3; d < 7; d++) px(Math.round(8 + Math.cos(a) * d), Math.round(6 + Math.sin(a) * d), d < 5 ? '#f8d030' : '#f08030')
    }
    px(7, 5, '#ffffff', 3, 3)
  }), 0, 0], [EGG_FX.punchFist(), 0, 3]]),
  rollout: () => icon(13, 11, (px) => {
    px(5, 1, '#584838', 5, 1); px(4, 2, '#8a7860', 7, 7); px(5, 9, '#584838', 5, 1)
    px(5, 3, '#b8a888', 3, 2); px(8, 6, '#584838', 2, 1); px(5, 7, '#584838', 1, 1)
    px(0, 3, '#d8c8a8', 3, 1); px(1, 5, '#d8c8a8', 2, 1); px(0, 7, '#d8c8a8', 3, 1)
  }),
  iceBall: () => icon(11, 11, (px) => {
    px(3, 0, '#78a8d8', 5, 1); px(1, 1, '#78a8d8', 9, 9); px(0, 3, '#78a8d8', 11, 5); px(3, 10, '#78a8d8', 5, 1)
    px(2, 2, '#e8f8ff', 6, 6); px(1, 4, '#e8f8ff', 1, 3); px(3, 1, '#e8f8ff', 4, 1)
    px(3, 3, '#ffffff', 2, 2); px(7, 7, '#a8d0f0', 2, 2)
  }),
  furyCutter: () => icon(12, 12, (px) => {
    for (let i = 0; i < 12; i++) {
      const a = -1.2 + (i / 11) * 2.4
      px(Math.round(4 + Math.cos(a) * 6), Math.round(6 + Math.sin(a) * 6), '#a8e070')
      px(Math.round(4 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 5), '#58a038')
      px(Math.round(1 + Math.cos(a) * 4), Math.round(6 + Math.sin(a) * 4), '#e8f8a0')
    }
  }),
  sacredSword: () => {
    const c = createCanvas(16, 16)
    const ctx = context2d(c)
    ctx.translate(8, 8)
    ctx.rotate(-Math.PI / 4)
    ctx.drawImage(EGG_FX.blade(), -11, -2.5)
    return outline(c)
  },
  dragonDarts: () => icon(13, 10, (px) => {
    for (const [ox, oy] of [[0, 0], [3, 5]] as const) {
      px(ox + 6, oy + 1, '#48a8a0', 4, 3); px(ox + 7, oy, '#48a8a0', 2, 1); px(ox + 7, oy + 4, '#48a8a0', 2, 1)
      px(ox + 8, oy + 2, '#f8e070'); px(ox + 2, oy + 2, '#a8e8e0', 4, 1); px(ox, oy + 2, '#70c8c0', 2, 1)
    }
  }),
  snarl: () => icon(12, 11, (px) => {
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 7; i++) {
        const a = -1 + (i / 6) * 2
        const r = 3 + k * 2.5
        px(Math.round(1 + Math.cos(a) * r), Math.round(5 + Math.sin(a) * r), ['#7048b0', '#4858b8', '#c83848'][k]!, 2, 1)
      }
    }
  }),
  gigaImpact: () => icon(13, 13, (px) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const len = i % 2 ? 4 : 6
      for (let d = 1; d <= len; d++) px(Math.round(6 + Math.cos(a) * d), Math.round(6 + Math.sin(a) * d), d < 3 ? '#ffffff' : i % 2 ? '#f8d030' : '#f08030')
    }
    px(5, 5, '#ffffff', 3, 3)
  }),
  flail: () => icon(12, 11, (px) => {
    for (let i = 0; i < 10; i++) {
      const a = 0.4 + (i / 9) * 2.4
      px(Math.round(6 + Math.cos(a) * 5), Math.round(4 + Math.sin(a) * 5), '#ffffff', 2, 1)
      px(Math.round(6 + Math.cos(a) * 4), Math.round(4 + Math.sin(a) * 4), '#78b0e8')
    }
    px(2, 0, '#a8d8f8'); px(9, 1, '#a8d8f8'); px(5, 2, '#f87070', 2, 2)
  }),
  boneRush: () => {
    const c = createCanvas(14, 14)
    const ctx = context2d(c)
    ctx.translate(7, 7)
    ctx.rotate(-Math.PI / 4)
    ctx.drawImage(EGG_FX.bone(), -6, -3)
    return outline(c)
  },
  metronome: () => EGG_FX.finger(),
  sketch: () => EGG_FX.brush(),
  echoedVoice: () => icon(13, 11, (px) => {
    px(0, 4, '#f0e0ff', 2, 3)
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 7; i++) {
        const a = -0.9 + (i / 6) * 1.8
        const r = 4 + k * 3
        px(Math.round(Math.cos(a) * r), Math.round(5 + Math.sin(a) * r), ['#ffffff', '#c8a8f8', '#a070f8'][k]!)
      }
    }
  }),
  curse: () => compose(12, 13, [[paint(12, 13, (px) => {
    px(2, 6, '#7048b0', 8, 6); px(3, 4, '#a070d8', 6, 3); px(5, 2, '#a070d8', 2, 2); px(4, 7, '#c8a8f0', 4, 3)
  }), 0, 0], [EGG_FX.nail(), 2, 0]]),
} satisfies Record<string, () => PixelSprite>
