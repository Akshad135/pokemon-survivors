import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'

/**
 * Pixel art of the third batch of egg signatures (`game/eggMoves3.ts`): the
 * sprites their effects blit (Tinkaton's hammer, the moon, snow boulders…)
 * and their move icons. Everything else is drawn in code by `eggMove3Fx.ts`.
 * Only the engine is imported, so `art.ts` can spread the icons in without a cycle.
 */

/** Pads string rows to one width so ragged hand-written rows stay aligned. */
const sprite = (rows: readonly string[], palette: Palette) => {
  const w = Math.max(...rows.map((r) => r.length))
  return fromStrings(rows.map((r) => r.padEnd(w, '.')), palette)
}

/** A 1px outline around the opaque pixels, so icons read on any card. */
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

const icon = (rows: readonly string[], palette: Palette) => outline(sprite(rows, palette))

/** Tinkaton's hammer, head up: a pink-and-steel block on a long handle. */
const HAMMER = [
  '.1111111111111.',
  '122222222222221',
  '123333333333321',
  '124444444444421',
  '124444444444421',
  '123333333333321',
  '122222222222221',
  '.1111111111111.',
  '......151......',
  '......151......',
  '......151......',
  '......151......',
  '......151......',
  '......151......',
  '.....16661.....',
  '......111......',
]
/** The moon orb: a pink-white full moon with craters. */
const MOON = [
  '...1111...',
  '..122221..',
  '.12333321.',
  '1233433321',
  '1233333421',
  '1243333321',
  '1233334321',
  '.12333321.',
  '..122221..',
  '...1111...',
]
/** A snow boulder of the avalanche. */
const SNOWBALL = [
  '..1111..',
  '.122221.',
  '12333221',
  '12333321',
  '12233321',
  '12222321',
  '.122221.',
  '..1111..',
]
/** Ceruledge's spectral blade, pointing right: a purple-black edge rimmed in ghost fire. */
const BITTER = [
  '.......44444444444....',
  '55...4411111111111444.',
  '565554122222222222221.',
  '55...4411111111111444.',
  '.......44444444444....',
]
/** An iron weight (Heavy Slam's icon). */
const WEIGHT = [
  '....1111....',
  '....1..1....',
  '..11111111..',
  '.1222222221.',
  '.1233333321.',
  '123333333321',
  '123333333321',
  '122222222221',
  '111111111111',
]

/** A dancing flame in three frames, its tip swaying. */
const FLAME = [
  [
    '...1....',
    '...11...',
    '..121...',
    '..1221..',
    '.12321..',
    '.123321.',
    '12334321',
    '12344321',
    '.123321.',
    '..1111..',
  ],
  [
    '....1...',
    '...11...',
    '...121..',
    '..1221..',
    '..12321.',
    '.123321.',
    '12334321',
    '12344321',
    '.123321.',
    '..1111..',
  ],
  [
    '..1.....',
    '..11....',
    '..121...',
    '.1221...',
    '.12321..',
    '.123321.',
    '12343321',
    '12344321',
    '.123321.',
    '..1111..',
  ],
]
const FIRE_PALETTE = { 1: '#c83018', 2: '#f87830', 3: '#f8d040', 4: '#fff8d0' }
const SOUL_PALETTE = { 1: '#482878', 2: '#a058e0', 3: '#f8a050', 4: '#fff0c0' }

export const EGG3_FX = {
  flame: FLAME.map((rows) => lazy(() => sprite(rows, FIRE_PALETTE))),
  soulFlame: FLAME.map((rows) => lazy(() => sprite(rows, SOUL_PALETTE))),
  hammer: lazy(() => sprite(HAMMER, { 1: '#383048', 2: '#9098b0', 3: '#e88aa8', 4: '#f8c0d0', 5: '#c87890', 6: '#f8d0e0' })),
  hammerHot: lazy(() => sprite(HAMMER, { 1: '#383048', 2: '#c8d0e0', 3: '#f8a8c0', 4: '#ffffff', 5: '#c87890', 6: '#f8d0e0' })),
  moon: lazy(() => sprite(MOON, { 1: '#a04878', 2: '#f088b8', 3: '#fff0f8', 4: '#f8c8e0' })),
  snowball: lazy(() => sprite(SNOWBALL, { 1: '#4878a8', 2: '#a8d0f0', 3: '#ffffff' })),
  bitterBlade: lazy(() => sprite(BITTER, { 1: '#281838', 2: '#a078e8', 4: '#f87830', 5: '#f8b040', 6: '#ffffff' })),
}

/** Icons of the third batch of signatures, spread into `art.ts`'s `MOVE_ICON_ART`. */
export const EGG_MOVE_3_ICONS = {
  fieryDance: () => icon([
    '....1.......',
    '...121..1...',
    '...131.121..',
    '1..1331131..',
    '21..1111.1..',
    '31..........',
    '1.......1...',
    '.......121..',
    '..1....131..',
    '.121...1331.',
    '.1331...11..',
    '..11........',
  ], { 1: '#c83018', 2: '#f8a030', 3: '#fff0a0' }),
  overdrive: () => icon([
    '......4444..',
    '......4..44.',
    '......4.....',
    '......4.....',
    '......4.....',
    '...3334.....',
    '..33334.....',
    '..3333..2...',
    '...33..22...',
    '......2222..',
    '........22..',
    '........2...',
  ], { 2: '#f8e030', 3: '#a058c8', 4: '#e8c0f8' }),
  gigatonHammer: () => outline(sprite(HAMMER.filter((_, i) => i !== 9 && i !== 11), { 1: '#383048', 2: '#9098b0', 3: '#e88aa8', 4: '#f8c0d0', 5: '#c87890', 6: '#f8d0e0' })),
  bitterBlade: () => {
    const c = createCanvas(18, 18)
    const ctx = context2d(c)
    ctx.translate(9, 9)
    ctx.rotate(-Math.PI / 4)
    ctx.drawImage(EGG3_FX.bitterBlade(), -11, -2.5)
    return outline(c)
  },
  leechLife: () => icon([
    '....11....',
    '...1221...',
    '..122221..',
    '.12233221.',
    '.12232221.',
    '1222222221',
    '1222222221',
    '.12222221.',
    '..111111..',
    '..4....4..',
    '..44..44..',
  ], { 1: '#701828', 2: '#e04048', 3: '#f8a0a0', 4: '#ffffff' }),
  fireFang: () => icon([
    '...5.....5...',
    '..565...565..',
    '.11111111111.',
    '1222222222221',
    '.13.13.31.31.',
    '..1..1.1..1..',
    '.............',
    '..1..1.1..1..',
    '.13.13.31.31.',
    '1222222222221',
    '.11111111111.',
  ], { 1: '#702010', 2: '#f87830', 3: '#ffffff', 5: '#f8d040', 6: '#ffffff' }),
  furySwipes: () => icon([
    '1.....1.....',
    '.1.....1....',
    '..2.....2.1.',
    '...2.....2.1',
    '....3.....3.',
    '1....3.....3',
    '.1....3.....',
    '..2....3....',
    '...2........',
    '....3.......',
    '.....3......',
  ], { 1: '#ffffff', 2: '#f8e8c8', 3: '#c89868' }),
  heavySlam: () => icon(WEIGHT, { 1: '#283040', 2: '#68788c', 3: '#b8c8d8' }),
  bulldoze: () => icon([
    '.......1.....',
    '.....11211...',
    '...112332211.',
    '..12333333321',
    '.123344333321',
    '1233333344321',
    '1111111111111',
    '4.4.4..4..4.4',
  ], { 1: '#4a2c14', 2: '#8a5a2c', 3: '#b88848', 4: '#e0c080' }),
  perishSong: () => icon([
    '.....111111',
    '.....122221',
    '.....1...11',
    '.....1....1',
    '.....1....1',
    '..1111..111',
    '.12221.1221',
    '.12221.1221',
    '..111...11.',
  ], { 1: '#201828', 2: '#706080' }),
  chargeBeam: () => icon([
    '..111.......',
    '.12221......',
    '1233321111..',
    '1234443222111',
    '1233321111..',
    '.12221......',
    '..111.......',
  ], { 1: '#806010', 2: '#f8c820', 3: '#f8f080', 4: '#ffffff' }),
  moonblast: () => outline(EGG3_FX.moon(), '#401830'),
  frostBreath: () => icon([
    '.......2.2.2',
    '..1111..222.',
    '.122221.2.2.',
    '12333221..2.',
    '1233322221..',
    '12333221..2.',
    '.122221.2.2.',
    '..1111..222.',
    '.......2.2.2',
  ], { 1: '#4878a8', 2: '#a8e0f8', 3: '#ffffff' }),
  avalanche: () => icon([
    '5.....1111..',
    '.5...122221.',
    '..5.12333221',
    '....12333321',
    '5...12233321',
    '.5..12222321',
    '..5..122221.',
    '......1111..',
    '............',
    '444444444444',
  ], { 1: '#4878a8', 2: '#a8d0f0', 3: '#ffffff', 4: '#d8e8f8', 5: '#a8d0f0' }),
} satisfies Record<string, () => PixelSprite>
