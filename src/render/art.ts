import { context2d, createCanvas, fromStrings, type Palette, type PixelSprite } from '../engine/pixelart'
import type { Medal } from '../data/achievements'
import type { ItemId } from '../data/items'
import type { BagItem } from '../game/bag'
import type { EggTier } from '../game/eggs'
import type { RibbonTier } from '../game/ribbons'
import type { UpgradeId } from '../game/meta'
import type { MoveId } from '../game/moves'

/**
 * All hand-authored pixel art (projectiles, pickups, icons). Sprites are built
 * lazily on first use because they need a DOM canvas.
 */

/** Adds a 1px outline around opaque pixels so small sprites read on grass. */
export const outlined = (sprite: PixelSprite, color = '#181818'): PixelSprite => {
  const canvas = createCanvas(sprite.width + 2, sprite.height + 2)
  const ctx = context2d(canvas)
  const sil = createCanvas(sprite.width, sprite.height)
  const sctx = context2d(sil)
  sctx.drawImage(sprite, 0, 0)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = color
  sctx.fillRect(0, 0, sil.width, sil.height)
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]] as const) ctx.drawImage(sil, dx, dy)
  ctx.drawImage(sprite, 1, 1)
  return canvas
}

export const lazy = <T>(build: () => T) => {
  let value: T | undefined
  return () => (value ??= build())
}

export const art = (rows: readonly string[], palette: Palette, outline?: string) => {
  const sprite = fromStrings(rows, palette)
  return outline ? outlined(sprite, outline) : sprite
}

/* ---------------- Projectiles ---------------- */

const FIREBALL = ['..1221..', '.123321.', '12344321', '23444432', '23444432', '12344321', '.123321.', '..1221..']
const FLAME = [
  '....1....', '...12....', '...121...', '..1221...', '..12321..', '.122321..',
  '.1233321.', '12334321.', '123443321', '123444321', '.1234321.', '..11111..',
]
const DROPLET = ['..11111..', '.1222221.', '122333421', '.1222221.', '..11111..']
const LEAF = ['......111', '....11221', '...122231', '..122321.', '.122321..', '.12321...', '1231.....', '131......', '11.......']
const STAR = ['....1....', '...121...', '111232111', '.1233321.', '..12321..', '..12121..', '.121.121.', '.11...11.']
/** Fist pointing right. */
const FIST = ['..1111..', '.122221.', '12333311', '12333331', '12333321', '.1222221', '..11111.']
const STEEL_ORB = ['..1111..', '.122221.', '12233221', '12344321', '12344321', '12233221', '.122221.', '..1111..']
/** Quill arrow pointing right. */
const ARROW = ['11.......2.', '.1333333322', '11.......2.']
const SHURIKEN = ['...1...', '...1...', '..121..', '1112111', '..121..', '...1...', '...1...']
/** Upper jaw; the lower one is the same rows reversed. */
const JAW = ['.111111111.', '12222222221', '13.3.3.3.31']
const ORB = ['..111..', '.12221.', '1223221', '1233321', '1223221', '.12221.', '..111..']
const HEART = ['.11.11.', '1221221', '1232221', '1222221', '.12221.', '..121..', '...1...']
const NOTE = ['...11.', '...121', '...1.1', '...1..', '.111..', '1221..', '.11...']
const BLADE = ['.......11', '.....1121', '...11231.', '.11231...', '1231.....', '11.......']

/* Evolved moves */
const FIRE_STAR = [
  '......1......', '.....121.....', '.....121.....', '....12321....', '1111233321111', '.12223432221.',
  '..122343221..', '...1234321...', '...1233321...', '..123212321..', '..1221.1221..', '.1221...1221.', '.111.....111.',
]
const JET = ['......1111111..', '...11122222221.', '.1122233333321.', '122333444443321', '.1122233333321.', '...11122222221.', '......1111111..']
const TRIANGLE = ['....1....', '...121...', '...121...', '..12321..', '..12321..', '.1233321.', '.1222221.', '111111111']
/* Lunges, chains, mines and turrets (`render/moveFx.ts`) */
/** Caltrop: 1 tips, 2 spikes, 3 core. */
const SPIKE = ['....1....', '...121...', '1..121..1', '.1123211.', '..12321..', '.1.121.1.', '1...1...1']
/** A cluster of barbs: 1 tips, 2 spikes, 3 core, 4 shine. */
const BARBS = [
  '1....1....1', '.1...2...1.', '..2.121.2..', '...12321...', '12223432221',
  '...12321...', '..2.121.2..', '.1...2...1.', '1....1....1',
]
/** Ghost flame: 1 rim, 2 body, 3 glow, 4 core. */
const WISP = [
  '......1....', '.....12....', '....121....', '...12321...', '..1223221..', '..1233321..', '.122343221.',
  '.123444321.', '12334443321', '12344444321', '12334443321', '.123333321.', '..1222221..', '...11111...',
]
const WISP_SHOT = ['.111.', '12321', '13431', '12321', '.111.']
/** Speed streak pointing right: 1 trail, 2-4 lighter towards the tip. */
const QUICK = ['......1111.', '11...122221', '....1233321', '111.1234321', '....1233321', '11...122221', '......1111.']
/** Two targets (3) joined by a jagged arc (2). */
const CHAIN = ['33........', '332.......', '..2.......', '..2222....', '.....2....', '.....2222.', '........33', '........33']

/* Gen 3 type moves (`render/draw.ts`, `render/evolved.ts`) */
/** Ice shard pointing right: 1 edge, 2 ice, 3 light, 4 shine. */
const ICE_SHARD = ['..11.....', '.12211...', '1233321..', '123444321', '1233321..', '.12211...', '..11.....']
/** Three crystals stuck in the ground (a shard that stopped). */
const ICICLES = [
  '....1....', '...141...', '.1.131...', '141131.1.', '131131141', '131232131', '123222321', '.1111111.',
]
/** Boulder: 1 rim, 2 stone, 3 light, 4 shade. */
const BOULDER = [
  '...11111....', '..1233321...', '.123332221..', '12333222221.', '123322222241',
  '122222222441', '122222224441', '.1222244441.', '..11111111..',
]
/** Jagged stone pillar, drawn rising out of the ground. */
const PILLAR = [
  '...1...', '...1...', '..131..', '..131..', '..1321.', '.13321.', '.13221.',
  '.132221', '1332221', '1322241', '1322441', '1222441', '1224441', '1111111',
]
/** Needle pointing right: 1 fletching, 2 shaft, 3 tip. */
const NEEDLE = ['11......', '.1222223', '11......']
/** Horn pointing right. */
const HORN = ['111..........', '1221111......', '.1222221111..', '.123333333441', '.1222221111..', '1221111......', '111..........']
const SNOWFLAKE = ['....1....', '.1..1..1.', '..1.1.1..', '...121...', '111222111', '...121...', '..1.1.1..', '.1..1..1.', '....1....']

const ICE = { 1: '#3878a8', 2: '#98d8f8', 3: '#d8f0ff', 4: '#ffffff' }
const STONE = { 1: '#3a2a18', 2: '#a08048', 3: '#d8c080', 4: '#685028' }
const DRAGON_CONE = { 1: '#2a1070', 2: '#7038f8', 3: '#a070f8', 4: '#f0e0ff' }

const TRI_PALETTES: readonly Palette[] = [
  { 1: '#a02010', 2: '#f06020', 3: '#ffd080' },
  { 1: '#2060a0', 2: '#60c0f0', 3: '#e0f8ff' },
  { 1: '#a07800', 2: '#f8d830', 3: '#fff8c0' },
]

export const FX = {
  ember: lazy(() => [
    art(FIREBALL, { 1: '#a82010', 2: '#e05018', 3: '#f8a030', 4: '#fff0a0' }),
    art(FIREBALL, { 1: '#c03018', 2: '#f07020', 3: '#f8c040', 4: '#ffffff' }),
  ]),
  flame: lazy(() => {
    const pal = { 1: '#c03018', 2: '#f07020', 3: '#f8b830', 4: '#fff8c0' }
    return [fromStrings(FLAME, pal), fromStrings(FLAME, pal, { mirror: true })]
  }),
  /** Mega Charizard X's blue dragon fire (Dragon Flare). */
  dragonFlame: lazy(() => {
    const pal = { 1: '#2830a0', 2: '#3870f0', 3: '#78c8f8', 4: '#e8f8ff' }
    return [fromStrings(FLAME, pal), fromStrings(FLAME, pal, { mirror: true })]
  }),
  water: lazy(() => art(DROPLET, { 1: '#2848b0', 2: '#6890f0', 3: '#a8d0f8', 4: '#ffffff' })),
  leaf: lazy(() => art(LEAF, { 1: '#285820', 2: '#58b838', 3: '#a8e870' })),
  star: lazy(() => art(STAR, { 1: '#c88800', 2: '#f8d830', 3: '#fff8c0' })),
  fireBlast: lazy(() => [
    art(FIRE_STAR, { 1: '#a01810', 2: '#e85018', 3: '#f8b030', 4: '#fff8d0' }, '#401008'),
    art(FIRE_STAR, { 1: '#c03018', 2: '#f87828', 3: '#f8d050', 4: '#ffffff' }, '#401008'),
  ]),
  hydroPump: lazy(() => art(JET, { 1: '#1838a0', 2: '#4878e8', 3: '#a8d8f8', 4: '#ffffff' }, '#102060')),
  leafStorm: lazy(() => art(LEAF, { 1: '#205018', 2: '#70d048', 3: '#e0f8a0' }, '#103010')),
  triAttack: lazy(() => TRI_PALETTES.map((pal) => art(TRIANGLE, pal, '#181818'))),
  fist: lazy(() => art(FIST, { 1: '#601818', 2: '#c03028', 3: '#f89070' }, '#281010')),
  steel: lazy(() => art(STEEL_ORB, { 1: '#404858', 2: '#8890a8', 3: '#c8d0e0', 4: '#ffffff' })),
  arrow: lazy(() => art(ARROW, { 1: '#58b838', 2: '#a070d8', 3: '#e8e0c8' }, '#281838')),
  shuriken: lazy(() => art(SHURIKEN, { 1: '#3068d0', 2: '#d0f0ff' }, '#183060')),
  jaws: lazy(() => {
    const pal = { 1: '#281820', 2: '#705848', 3: '#ffffff' }
    return { top: art(JAW, pal), bottom: art([...JAW].reverse(), pal) }
  }),
  pyro: lazy(() => art(FIREBALL, { 1: '#a82010', 2: '#f07020', 3: '#f8c040', 4: '#ffffff' }, '#401008')),
  psy: lazy(() => [
    art(ORB, { 1: '#a03068', 2: '#f85888', 3: '#ffd0e8' }),
    art(ORB, { 1: '#c04080', 2: '#f888b0', 3: '#ffffff' }),
  ]),
  heart: lazy(() => art(HEART, { 1: '#a02858', 2: '#f878a8', 3: '#ffffff' }, '#401020')),
  note: lazy(() => art(NOTE, { 1: '#c03018', 2: '#f8b030' }, '#401008')),
  blade: lazy(() => art(BLADE, { 1: '#286020', 2: '#78d850', 3: '#f0fff0' }, '#183010')),
  spikes: lazy(() => art(SPIKE, { 1: '#e0b8f0', 2: '#a040c0', 3: '#502060' }, '#201028')),
  barbs: lazy(() => art(BARBS, { 1: '#f0d8f8', 2: '#b058d0', 3: '#6a2a88', 4: '#88c040' }, '#201028')),
  wisp: lazy(() => {
    const pal = { 1: '#3040a0', 2: '#5870e8', 3: '#a8c0ff', 4: '#ffffff' }
    return [outlined(fromStrings(WISP, pal), '#181838'), outlined(fromStrings(WISP, pal, { mirror: true }), '#181838')]
  }),
  wispShot: lazy(() => art(WISP_SHOT, { 1: '#3040a0', 2: '#78a0f8', 3: '#c8d8ff', 4: '#ffffff' })),
  inferno: lazy(() => {
    const pal = { 1: '#801008', 2: '#e03010', 3: '#f88020', 4: '#fff0a0' }
    return [outlined(fromStrings(FLAME, pal), '#300808'), outlined(fromStrings(FLAME, pal, { mirror: true }), '#300808')]
  }),
  iceShard: lazy(() => art(ICE_SHARD, ICE, '#183048')),
  icicles: lazy(() => art(ICICLES, ICE, '#183048')),
  /** Blizzard's shards: whiter, with a frosty outline. */
  blizzardShard: lazy(() => art(ICE_SHARD, { 1: '#78b8e8', 2: '#d8f0ff', 3: '#ffffff', 4: '#ffffff' }, '#3878a8')),
  blizzardIcicles: lazy(() => art(ICICLES, { 1: '#5898c8', 2: '#c8e8ff', 3: '#ffffff', 4: '#ffffff' }, '#183048')),
  boulder: lazy(() => art(BOULDER, STONE, '#181008')),
  pillar: lazy(() => art(PILLAR, STONE, '#181008')),
  pin: lazy(() => art(NEEDLE, { 1: '#587018', 2: '#d8f070', 3: '#ffffff' }, '#203008')),
  horn: lazy(() => art(HORN, { 1: '#585870', 2: '#c8c8d8', 3: '#e8e8f0', 4: '#ffffff' }, '#202030')),
  snowflake: lazy(() => art(SNOWFLAKE, { 1: '#98d8f8', 2: '#ffffff' }, '#183048')),
}

/* ---------------- Eggs ---------------- */

/** 1 shade, 2 shell, 3 shine, 4 spots. */
const EGG = [
  '....2222....',
  '...222222...',
  '..23222222..',
  '..32224422..',
  '.2222244422.',
  '.2222224421.',
  '.4422222221.',
  '244422222221',
  '244222222221',
  '222222224421',
  '222222244421',
  '122222224211',
  '.1222222211.',
  '..11111111..',
]
/** The crack that splits the shell, revealed from the middle out as hatching goes on. */
const EGG_CRACK = ['', '', '', '', '1...1...1...', '.1.1.1.1.1.1', '..1...1...1.']

const EGG_PALETTES = {
  common: { 1: '#c8b890', 2: '#f8f0d8', 3: '#ffffff', 4: '#58b858' },
  rare: { 1: '#c8b890', 2: '#f8f0d8', 3: '#ffffff', 4: '#4888e8' },
  ultra: { 1: '#282840', 2: '#45456a', 3: '#9090c0', 4: '#f8c830' },
  friend: { 1: '#d888a0', 2: '#f8d0dc', 3: '#ffffff', 4: '#e84870' },
} as const satisfies Record<EggTier, Palette>

const CRACK_COLORS = { common: '#584830', rare: '#584830', ultra: '#f8f0c0', friend: '#803048' } as const satisfies Record<EggTier, string>

/** Memoized sprite per key (one per tier and crack stage). */
const eggCache = new Map<string, PixelSprite>()
const toSprite = (key: string, build: () => PixelSprite) => {
  let s = eggCache.get(key)
  if (!s) eggCache.set(key, (s = build()))
  return s
}

export const eggSprite = (tier: EggTier) => toSprite(`egg:${tier}`, () => art(EGG, EGG_PALETTES[tier], '#181818'))

/**
 * Crack overlay for `stage` 1..3, aligned with `eggSprite` (outline included):
 * each stage opens the crack two pixels further from the middle.
 */
export const eggCrack = (tier: EggTier, stage: number) =>
  toSprite(`crack:${tier}:${stage}`, () => {
    const half = stage * 2
    const rows = EGG_CRACK.map((row) => [...row.padEnd(12, '.')].map((c, x) => (Math.abs(x - 5.5) < half ? c : '.')).join(''))
    const canvas = createCanvas(14, 16)
    context2d(canvas).drawImage(fromStrings(rows, { 1: CRACK_COLORS[tier] }), 1, 1)
    return canvas
  })

export const eggIcon = (tier: EggTier) => toIconUrl(`egg:${tier}`, () => eggSprite(tier))

/* ---------------- Shiny sparkles ---------------- */

/** Classic shiny twinkle: a four-point star in three sizes (small → big). */
const SPARKLES = [
  ['.1.', '121', '.1.'],
  ['..1..', '..1..', '11211', '..1..', '..1..'],
  ['...1...', '...1...', '..121..', '1122211', '..121..', '...1...', '...1...'],
] as const

export const SPARKLE = lazy(() => SPARKLES.map((rows) => fromStrings(rows, { 1: '#f8e070', 2: '#ffffff' })))

/* ---------------- Boss hazards ---------------- */

const SHARD = ['....11.', '..1221.', '1123331', '..1221.', '....11.']
const SMALL_ORB = ['.111.', '12221', '12321', '12221', '.111.']
const ROCK = ['..1111..', '.122221.', '12233221', '12232221', '12222211', '.112211.', '..1111..']

export const HAZARD_FX = {
  ice: lazy(() => art(SHARD, { 1: '#3878a8', 2: '#98d8f8', 3: '#ffffff' }, '#183048')),
  /** A leaf blade, flown point first like the ice shard. */
  grass: lazy(() => art(SHARD, { 1: '#286820', 2: '#70d048', 3: '#e0f8a0' }, '#103010')),
  psychic: lazy(() => art(SMALL_ORB, { 1: '#a02868', 2: '#f85888', 3: '#ffffff' }, '#401030')),
  rock: lazy(() => art(ROCK, { 1: '#584020', 2: '#a08040', 3: '#d8c080' }, '#181818')),
  water: lazy(() => art(SMALL_ORB, { 1: '#2858b8', 2: '#58a8f8', 3: '#e0f8ff' }, '#102048')),
  dragon: lazy(() => art(SMALL_ORB, { 1: '#4820a8', 2: '#a070f8', 3: '#f0e0ff' }, '#180840')),
  steel: lazy(() => art(SMALL_ORB, { 1: '#4868a8', 2: '#a8c8f0', 3: '#ffffff' }, '#182040')),
  aero: lazy(() => art(SMALL_ORB, { 1: '#7890c0', 2: '#d8e8f8', 3: '#ffffff' }, '#283858')),
  judgment: lazy(() => art(SMALL_ORB, { 1: '#c09020', 2: '#f8e070', 3: '#ffffff' }, '#483008')),
}

/* ---------------- Enemy traits ---------------- */

const PLUS = ['..1..', '..1..', '11211', '..1..', '..1..']
/** "!" over an enemy about to strike (fuse lit, beam aiming, leap crouch). */
const ALERT = ['22', '22', '22', '22', '33', '..', '22', '33']
/** Beam cross-sections, one pixel long: stretched along the beam's length when drawn. */
const BEAM = ['1', '2', '2', '3', '3', '3', '2', '2', '1']
const BEAM_TELEGRAPH = ['1', '2', '2', '2', '2', '2', '1']

const beams = new Map<string, PixelSprite>()

export const TRAIT_FX = {
  healCross: lazy(() => art(PLUS, { 1: '#58d858', 2: '#ffffff' }, '#184818')),
  alert: lazy(() => art(ALERT, { 2: '#f8e040', 3: '#e07020' }, '#401808')),
  /** Two frames: the edges alternate colors as the telegraph blinks. */
  beamTelegraph: lazy(() => [
    fromStrings(BEAM_TELEGRAPH, { 1: '#f84830', 2: 'rgba(248,72,48,0.32)' }),
    fromStrings(BEAM_TELEGRAPH, { 1: '#f8e040', 2: 'rgba(248,224,64,0.28)' }),
  ]),
  /** The beam itself, colored by the shooter's type (cached per color). */
  beam: (color: string) => {
    let sprite = beams.get(color)
    if (!sprite) beams.set(color, (sprite = fromStrings(BEAM, { 1: '#282018', 2: color, 3: '#ffffff' })))
    return sprite
  },
}

/* ---------------- Pickups ---------------- */

const CANDY = ['..111..', '1122211', '.12321.', '1122211', '..111..']
const CANDY_TIERS: readonly Palette[] = [
  { 1: '#2850a8', 2: '#58a0f8', 3: '#e0f0ff' },
  { 1: '#207830', 2: '#58d058', 3: '#e0ffe0' },
  { 1: '#a83010', 2: '#f87830', 3: '#fff0c0' },
  { 1: '#602890', 2: '#b058e8', 3: '#f8e0ff' },
]
const BERRY = ['....22..', '...22...', '.111111.', '11133111', '11131111', '11111111', '.111111.', '..1111..']
const POKEBALL = ['..1111..', '.125221.', '12222221', '11144111', '13344331', '13333331', '.133331.', '..1111..']

/** Poké Dollar tiers: single coin (₽10), coin stack (₽50), money bag (₽250). */
const COIN = ['.1111.', '123321', '132221', '122221', '122211', '.1111.']
const COIN_STACK = ['.11111.', '1233321', '.11111.', '1222221', '.11111.', '1222221', '.11111.']
const MONEY_BAG = ['.1....1.', '..1111..', '..1221..', '.122221.', '12233221', '12322321', '12233221', '12223221', '.122221.', '..1111..']
const GOLD = { 1: '#a86000', 2: '#f8c830', 3: '#fff8b0' }

export const PICKUPS = {
  coins: lazy(() => [
    art(COIN, GOLD, '#181818'),
    art(COIN_STACK, GOLD, '#181818'),
    art(MONEY_BAG, { 1: '#583010', 2: '#c88848', 3: '#f8d030' }, '#181818'),
  ]),
  candy: lazy(() => CANDY_TIERS.map((pal) => art(CANDY, pal, '#181818'))),
  berry: lazy(() => art(BERRY, { 1: '#3870d8', 2: '#48a838', 3: '#b8d8ff' }, '#181818')),
  pokeball: lazy(() => art(POKEBALL, { 1: '#202028', 2: '#e83838', 3: '#f0f0f0', 4: '#ffffff', 5: '#f8a0a0' }, '#181818')),
}

/* ---------------- Icons (HUD / level-up) ---------------- */

const BOLT = ['...111.', '..121..', '.121...', '1222221', '...121.', '..121..', '.11....']
const SPIRAL = ['.1111...', '1....1..', '1.11..1.', '1.1.1.1.', '1.1..1.1', '1..11..1', '.1....1.', '..1111..']
const VINE = ['.....11.', '....1221', '..11.11.', '.12.....', '.1......', '.12.....', '..121...', '....11..']
const BLOB = ['...11...', '..1221..', '.122221.', '12232221', '12222221', '.122221.', '..1111..']
const WIND = ['.1111...', '1....1..', '.....1..', '11111...', '........', '1111111.', '.......1', '.....11.']
const CRACK = ['22222222', '21222212', '22122122', '22211222', '22212112', '22122221', '21222211', '22222222']
const DRUM = ['.111111.', '12222221', '13333331', '13131331', '13333331', '13313131', '13333331', '.111111.']
const SHELL = ['...11...', '..1221..', '.122221.', '12323231', '12323231', '.111111.']

const CONE = ['......1111', '...1112221', '1112233321', '1223344321', '1112233321', '...1112221', '......1111']
const WAVE = ['...11111..', '..1222221.', '.12233.121', '.1231...1.', '1223......', '12231...11', '1222311121', '.11111111.']
const TORNADO = ['1111111111', '.12222221.', '..111111..', '..1222221.', '...11111..', '...12221..', '....111...', '....121...', '.....1....']
const GUNK = ['...111....', '..12221.1.', '.1224221121', '12222222221', '12232242221', '1222222221', '.11111111.']

/** Layers several sprites on one canvas (cluster icons like Leaf Storm). */
const compose = (w: number, h: number, layers: ReadonlyArray<readonly [PixelSprite, number, number]>) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  for (const [sprite, x, y] of layers) ctx.drawImage(sprite, x, y)
  return canvas
}

const MOVE_ICON_ART: Record<MoveId, () => PixelSprite> = {
  ember: () => FX.ember()[0]!,
  fireSpin: () => FX.flame()[0]!,
  waterGun: () => FX.water(),
  whirlpool: () => art(SPIRAL, { 1: '#3870e0' }, '#a8d0f8'),
  razorLeaf: () => FX.leaf(),
  vineWhip: () => art(VINE, { 1: '#286020', 2: '#78c850' }),
  swift: () => FX.star(),
  thunder: () => art(BOLT, { 1: '#c89000', 2: '#f8e030' }, '#504010'),
  sludgeBomb: () => art(BLOB, { 1: '#502060', 2: '#a040a0', 3: '#e0a0f0' }),
  gust: () => art(WIND, { 1: '#e8f0ff' }, '#58607a'),
  flamethrower: () => art(CONE, { 1: '#a82010', 2: '#f07020', 3: '#f8c040', 4: '#ffffff' }, '#401008'),
  fireBlast: () => FX.fireBlast()[0]!,
  hydroPump: () => FX.hydroPump(),
  surf: () => art(WAVE, { 1: '#2848b0', 2: '#68a0f0', 3: '#ffffff' }, '#102060'),
  leafStorm: () => compose(14, 14, [[FX.leafStorm(), 0, 3], [FX.leafStorm(), 3, 0]]),
  powerWhip: () => art(VINE, { 1: '#183818', 2: '#48a030' }, '#e0f0a0'),
  triAttack: () => compose(14, 14, FX.triAttack().map((tri, i) => [tri, [2, 0, 4][i]!, [0, 4, 4][i]!] as const)),
  wildboltStorm: () => {
    const bolt = art(BOLT, { 1: '#2890c8', 2: '#e0ffff' }, '#103048')
    return compose(13, 11, [[bolt, 0, 0], [bolt, 5, 2]])
  },
  gunkShot: () => art(GUNK, { 1: '#281830', 2: '#6a3a78', 3: '#b878c8', 4: '#88a038' }, '#100810'),
  hurricane: () => art(TORNADO, { 1: '#7880a8', 2: '#f0f4ff' }, '#30384a'),
  machPunch: () => FX.fist(),
  flashCannon: () => outlined(FX.steel()),
  spiritShackle: () => FX.arrow(),
  waterShuriken: () => FX.shuriken(),
  crunch: () => art([...JAW, ...[...JAW].reverse()], { 1: '#281820', 2: '#705848', 3: '#ffffff' }, '#a89888'),
  pyroBall: () => FX.pyro(),
  psyshock: () => outlined(FX.psy()[0]!),
  earthquake: () => art(CRACK, { 1: '#704820', 2: '#e0c068' }),
  drumBeating: () => art(DRUM, { 1: '#402010', 2: '#78c850', 3: '#a87840' }),
  disarmingVoice: () => FX.heart(),
  torchSong: () => FX.note(),
  leafBlade: () => FX.blade(),
  razorShell: () => art(SHELL, { 1: '#284880', 2: '#e8f0f8', 3: '#a8c8e8' }, '#101830'),
  quickAttack: () => art(QUICK, { 1: '#8890b0', 2: '#c8d0e8', 3: '#f0f4ff', 4: '#ffffff' }, '#303850'),
  extremeSpeed: () => art(QUICK, { 1: '#c89000', 2: '#f8d030', 3: '#fff8b0', 4: '#ffffff' }, '#503800'),
  shockWave: () => art(CHAIN, { 2: '#f8e030', 3: '#ffffff' }, '#504010'),
  thunderbolt: () => art(CHAIN, { 2: '#fff8a0', 3: '#f8a030' }, '#a03800'),
  hex: () => art(CHAIN, { 2: '#a070d8', 3: '#f0e0ff' }, '#281838'),
  toxicSpikes: () => FX.spikes(),
  barbBarrage: () => FX.barbs(),
  willOWisp: () => FX.wisp()[0]!,
  inferno: () => FX.inferno()[0]!,
  iceShard: () => FX.iceShard(),
  blizzard: () => FX.snowflake(),
  rockTomb: () => FX.boulder(),
  stoneEdge: () => compose(12, 16, [[FX.pillar(), 0, 0], [FX.pillar(), 4, 2]]),
  pinMissile: () => compose(10, 11, [[FX.pin(), 0, 0], [FX.pin(), 2, 3], [FX.pin(), 0, 6]]),
  megahorn: () => FX.horn(),
  dragonBreath: () => art(CONE, DRAGON_CONE, '#180840'),
  outrage: () => outlined(FX.dragonFlame()[0]!, '#180840'),
}

const ITEM_ART: Record<ItemId, readonly [readonly string[], Palette]> = {
  muscleBand: [['.111111.', '12222221', '13333331', '12222221', '.111111.'], { 1: '#803010', 2: '#f08030', 3: '#f8c070' }],
  quickClaw: [['.1....1.', '121..121', '.121121.', '..1221..', '..1221..', '.12..21.', '12....21'], { 1: '#204080', 2: '#78b0f8' }],
  wideLens: [['.1111...', '122221..', '123221..', '122221..', '.11111..', '....111.', '.....111', '......11'], { 1: '#404048', 2: '#a8d8f8', 3: '#ffffff' }],
  lightClay: [['.111111.', '12222221', '12322221', '12222221', '12222221', '.111111.'], { 1: '#806838', 2: '#d8c088', 3: '#f8f0d0' }],
  loadedDice: [['11111111', '12222221', '12322321', '12222221', '12232221', '12222221', '12322321', '11111111'], { 1: '#303030', 2: '#f8f8f8', 3: '#c02020' }],
  leftovers: [['....2...', '...2....', '.111111.', '11331111', '13111111', '11111111', '.111111.', '..1..1..'], { 1: '#c83030', 2: '#58a030', 3: '#f8a0a0' }],
  choiceScarf: [['11111111', '12222221', '11111221', '....1221', '....1221', '...12221', '...1..11'], { 1: '#a03060', 2: '#f878b0' }],
  luckyEgg: [['..111..', '.12221.', '1222221', '1232321', '1222221', '1222221', '.12221.', '..111..'], { 1: '#a07850', 2: '#f8f0d8', 3: '#f87878' }],
  dowsingMachine: [['.1....1.', '.1....1.', '..1..1..', '11111111', '12222221', '12333321', '12222221', '11111111'], { 1: '#404858', 2: '#88a0c0', 3: '#78f8a0' }],
  charcoal: [['..111...', '.12221..', '1222321.', '12222221', '.1222221', '..11111.'], { 1: '#101010', 2: '#383838', 3: '#f08030' }],
  mysticWater: [['...1...', '..121..', '.12221.', '1223221', '1222221', '.12221.', '..111..'], { 1: '#2848b0', 2: '#6890f0', 3: '#ffffff' }],
  miracleSeed: [['...2.2.', '....2..', '..111..', '.13331.', '1333331', '.13331.', '..111..'], { 1: '#704818', 2: '#58c838', 3: '#d8a858' }],
  silkScarf: [['11111111', '12222221', '11111221', '....1221', '....1221', '...12221', '...1..11'], { 1: '#9898a8', 2: '#f8f8f8' }],
  poisonBarb: [['......1', '.....11', '....121', '...121.', '..121..', '.121...', '111....'], { 1: '#502060', 2: '#c060d0' }],
  sharpBeak: [['.111....', '12221...', '122221..', '1222221.', '1111111.', '.12221..', '..111...'], { 1: '#806010', 2: '#f8c030' }],
  neverMeltIce: [['...1...', '..121..', '.12321.', '1233421', '1234421', '.12421.', '..121..', '...1...'], ICE],
  hardStone: [['..1111..', '.122221.', '12233221', '12232221', '12222211', '.112211.', '..1111..'], { 1: '#404040', 2: '#888078', 3: '#c8c0b0' }],
  silverPowder: [['.3...3.', '..1.1..', '.12221.', '1222221', '1232221', '1222221', '.11111.'], { 1: '#686878', 2: '#d8d8e8', 3: '#ffffff' }],
  dragonFang: [['1111111', '1333331', '1222221', '.12221.', '.1221..', '..121..', '..11...'], { 1: '#605838', 2: '#f8f0d0', 3: '#a070f8' }],
  magnet: [['33....44', '33....44', '11....11', '11....11', '11....11', '.11..11.', '..1111..'], { 1: '#808088', 3: '#e83030', 4: '#3060e0' }],
  kingsRock: [['3...3...3', '2...2...2', '22.222.22', '222242222', '211111112', '222222222'], { 1: '#c89000', 2: '#f8d830', 3: '#f8f8c0', 4: '#e83838' }],
  toxicOrb: [['..1111..', '.122221.', '12233221', '12322321', '12232321', '12223321', '.122221.', '..1111..'], { 1: '#502060', 2: '#a040c0', 3: '#e0a0f8' }],
  assaultVest: [['.11..11.', '12211221', '12222221', '.122221.', '.123321.', '.122221.', '.111111.'], { 1: '#5a3018', 2: '#c05838', 3: '#f8d058' }],
  metronome: [['...11...', '...14...', '..1241..', '..1421..', '.122421.', '.124221.', '12422221', '11111111'], { 1: '#583010', 2: '#d89040', 4: '#f8f0d0' }],
  powerHerb: [['.2...2..', '232.232.', '.2...2..', '..1.1...', '...1....', '..11....', '.1......'], { 1: '#386820', 2: '#f8f8f8', 3: '#e83838' }],
}

/* ---------------- Poké Mart icons ---------------- */

/** Vitamin bottle: 1 outline, 2 cap, 3 bottle, 4 shine, 5 label. */
const BOTTLE = ['..1111..', '..1221..', '..1111..', '.133331.', '13433331', '14555531', '13555531', '13333331', '.111111.']
const vitamin = (cap: string, body: string): readonly [readonly string[], Palette] => [
  BOTTLE,
  { 1: '#202028', 2: cap, 3: body, 4: '#ffffff', 5: '#f0f0f0' },
]

const UPGRADE_ART: Record<UpgradeId, readonly [readonly string[], Palette]> = {
  hpUp: vitamin('#f8f8f8', '#58c058'),
  protein: vitamin('#f8f8f8', '#e85040'),
  iron: vitamin('#f8f8f8', '#8890a8'),
  carbos: vitamin('#f8f8f8', '#40a8e0'),
  calcium: vitamin('#f8f8f8', '#e8d070'),
  zinc: vitamin('#f8f8f8', '#a070d0'),
  ppUp: vitamin('#f8d030', '#f078b8'),
  expCharm: [['.111111.', '12222221', '12333321', '12344321', '12333321', '12222221', '.111111.', '..1..1..'], { 1: '#283048', 2: '#4880d8', 3: '#a8d0f8', 4: '#f8f8f8' }],
  amuletCoin: [['1......1', '.1....1.', '..1111..', '.122221.', '12233221', '12322321', '12233221', '.122221.', '..1111..'], { 1: '#805000', 2: '#f8c830', 3: '#fff8b0' }],
  abilityCapsule: [['..1111..', '.122221.', '12222221', '12222221', '13333331', '13333331', '13333331', '.133331.', '..1111..'], { 1: '#283048', 2: '#e85878', 3: '#f8f0f8' }],
  escapeRope: [['..1111..', '.12..21.', '12.11.21', '1.1221.1', '1.1..1.1', '12.11.21', '.12..21.', '..1111..'], { 1: '#805828', 2: '#d8a868' }],
  shinyCharm: [['....1....', '...131...', '...121...', '.1122211.', '122232221', '.1122211.', '...121...', '...121...', '....1....'], { 1: '#805000', 2: '#f8c830', 3: '#ffffff' }],
}

/** The bag's items: a Lure spray (pink, like the games') and an Incense jar with its smoke. */
const BAG_ART: Record<BagItem, readonly [readonly string[], Palette]> = {
  lure: [['...11...', '..1221..', '.111111.', '.133331.', '.134431.', '.134431.', '.133331.', '.133331.', '..1111..'], { 1: '#402030', 2: '#f8f8f8', 3: '#f070b0', 4: '#ffe0f0' }],
  incense: [['..2..2..', '.2..2...', '..2..2..', '.111111.', '13333331', '13444431', '13333331', '.133331.', '..1111..'], { 1: '#302018', 2: '#d8d0f0', 3: '#c88848', 4: '#f8d8a0' }],
}

const iconCache = new Map<string, string>()

/** Icon as a data URL, padded to a square so it scales uniformly in the DOM. */
export const toIconUrl = (key: string, build: () => PixelSprite) => {
  const cached = iconCache.get(key)
  if (cached) return cached
  const sprite = build()
  const size = Math.max(sprite.width, sprite.height, 10)
  const canvas = createCanvas(size, size)
  context2d(canvas).drawImage(sprite, Math.floor((size - sprite.width) / 2), Math.floor((size - sprite.height) / 2))
  const url = canvas.toDataURL()
  iconCache.set(key, url)
  return url
}

export const moveIcon = (id: MoveId) => toIconUrl(`move:${id}`, MOVE_ICON_ART[id])

export const itemIcon = (id: ItemId) =>
  toIconUrl(`item:${id}`, () => {
    const [rows, pal] = ITEM_ART[id]
    return art(rows, pal, '#181818')
  })

export const bagIcon = (id: BagItem) =>
  toIconUrl(`bag:${id}`, () => {
    const [rows, pal] = BAG_ART[id]
    return art(rows, pal, '#181818')
  })

export const upgradeIcon = (id: UpgradeId) =>
  toIconUrl(`upgrade:${id}`, () => {
    const [rows, pal] = UPGRADE_ART[id]
    return art(rows, pal, '#181818')
  })

export const coinIcon = (tier = 0) => toIconUrl(`coin:${tier}`, () => PICKUPS.coins()[tier]!)
export const candyIcon = (tier: number) => toIconUrl(`candy:${tier}`, () => PICKUPS.candy()[tier]!)
export const berryIcon = () => toIconUrl('berry', PICKUPS.berry)
export const pokeballIcon = () => toIconUrl('pokeball', PICKUPS.pokeball)
export const sparkleIcon = () => toIconUrl('sparkle', () => outlined(SPARKLE()[2]!, '#584010'))

/** Presente Misterioso: a wrapped box with a bow. 1 outline, 2 ribbon, 3 paper, 4 paper shade, 5 ribbon shade. */
const GIFT = [
  '..11....11..',
  '.1221..1221.',
  '.1222112221.',
  '..11122111..',
  '133332233331',
  '144442254441',
  '111111111111',
  '.1333223331.',
  '.1333223331.',
  '.1444225441.',
  '.1111111111.',
]

export const giftIcon = () => toIconUrl('gift', () => art(GIFT, { 1: '#301018', 2: '#f8d030', 3: '#e83850', 4: '#a82038', 5: '#c89000' }))

/* ---------------- Medals ---------------- */

/** Achievement medal: a two-tone ribbon over a disc with a star. 1 outline, 2-3 ribbon, 4 star, 5 rim, 6 face. */
const MEDAL = [
  '.111...111.',
  '.122...331.',
  '..122.331..',
  '...12331...',
  '....121....',
  '...11111...',
  '..1566651..',
  '.156646651.',
  '.154444451.',
  '.156444651.',
  '.156464651.',
  '..1566651..',
  '...11111...',
]

const MEDAL_METAL = {
  bronze: { 4: '#f8c890', 5: '#985028', 6: '#d88848' },
  silver: { 4: '#ffffff', 5: '#788098', 6: '#c8d0e0' },
  gold: { 4: '#fff0a0', 5: '#b07010', 6: '#f8c838' },
} as const satisfies Record<Medal, Palette>

const MEDAL_RIBBON = { 1: '#282830', 2: '#e04848', 3: '#4878e0' } as const

/** Locked medals are a flat silhouette of the same shape. */
const MEDAL_LOCKED = { 1: '#383848', 2: '#686878', 3: '#585868', 4: '#9898a8', 5: '#585868', 6: '#787888' } as const

const MEDAL_SPRITES = new Map<string, PixelSprite>()

/** A medal as a sprite (share cards draw it on a canvas), cached. */
export const medalSprite = (medal: Medal, locked = false) => {
  const key = locked ? 'locked' : medal
  let sprite = MEDAL_SPRITES.get(key)
  if (!sprite) MEDAL_SPRITES.set(key, (sprite = art(MEDAL, locked ? MEDAL_LOCKED : { ...MEDAL_RIBBON, ...MEDAL_METAL[medal] })))
  return sprite
}

/* ---------------- Ribbons ---------------- */

/** Desafio do dia ribbon: a pleated rosette with two tails. 1 outline, 2 pleat shade, 3 pleat, 4 pleat light, 5 button, 6 shine. */
const RIBBON = [
  '...11111...',
  '..1343431..',
  '.134444431.',
  '.134555431.',
  '13455655431',
  '13455555431',
  '.134555431.',
  '.134444431.',
  '..1343431..',
  '...12121...',
  '..1221221..',
  '..122.221..',
  '.1221.1221.',
  '.111...111.',
]

const RIBBON_COLORS = {
  gold: { 1: '#584010', 2: '#b07010', 3: '#e0a828', 4: '#f8d860', 5: '#fff0a0', 6: '#ffffff' },
  silver: { 1: '#303848', 2: '#788098', 3: '#a8b0c8', 4: '#d8dce8', 5: '#f0f2f8', 6: '#ffffff' },
  bronze: { 1: '#402010', 2: '#985028', 3: '#c87840', 4: '#e8a868', 5: '#f8d0a0', 6: '#fff0e0' },
} as const satisfies Record<RibbonTier, Palette>

const RIBBON_SPRITES = new Map<RibbonTier, PixelSprite>()

/** A ribbon as a sprite (the Trainer Card draws it), cached. */
export const ribbonSprite = (tier: RibbonTier) => {
  let sprite = RIBBON_SPRITES.get(tier)
  if (!sprite) RIBBON_SPRITES.set(tier, (sprite = art(RIBBON, RIBBON_COLORS[tier])))
  return sprite
}

export const ribbonIcon = (tier: RibbonTier) => toIconUrl(`ribbon:${tier}`, () => ribbonSprite(tier))

export const medalIcon = (medal: Medal, locked = false) => toIconUrl(`medal:${locked ? 'locked' : medal}`, () => medalSprite(medal, locked))
