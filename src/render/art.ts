import { context2d, createCanvas, fromStrings, type Palette, type PixelSprite } from '../engine/pixelart'
import type { ItemId } from '../data/items'
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

const lazy = <T>(build: () => T) => {
  let value: T | undefined
  return () => (value ??= build())
}

const art = (rows: readonly string[], palette: Palette, outline?: string) => {
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

export const FX = {
  ember: lazy(() => [
    art(FIREBALL, { 1: '#a82010', 2: '#e05018', 3: '#f8a030', 4: '#fff0a0' }),
    art(FIREBALL, { 1: '#c03018', 2: '#f07020', 3: '#f8c040', 4: '#ffffff' }),
  ]),
  flame: lazy(() => {
    const pal = { 1: '#c03018', 2: '#f07020', 3: '#f8b830', 4: '#fff8c0' }
    return [fromStrings(FLAME, pal), fromStrings(FLAME, pal, { mirror: true })]
  }),
  water: lazy(() => art(DROPLET, { 1: '#2848b0', 2: '#6890f0', 3: '#a8d0f8', 4: '#ffffff' })),
  leaf: lazy(() => art(LEAF, { 1: '#285820', 2: '#58b838', 3: '#a8e870' })),
  star: lazy(() => art(STAR, { 1: '#c88800', 2: '#f8d830', 3: '#fff8c0' })),
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

export const PICKUPS = {
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
  magnet: [['33....44', '33....44', '11....11', '11....11', '11....11', '.11..11.', '..1111..'], { 1: '#808088', 3: '#e83030', 4: '#3060e0' }],
  kingsRock: [['3...3...3', '2...2...2', '22.222.22', '222242222', '211111112', '222222222'], { 1: '#c89000', 2: '#f8d830', 3: '#f8f8c0', 4: '#e83838' }],
  toxicOrb: [['..1111..', '.122221.', '12233221', '12322321', '12232321', '12223321', '.122221.', '..1111..'], { 1: '#502060', 2: '#a040c0', 3: '#e0a0f8' }],
  assaultVest: [['.11..11.', '12211221', '12222221', '.122221.', '.123321.', '.122221.', '.111111.'], { 1: '#5a3018', 2: '#c05838', 3: '#f8d058' }],
}

const iconCache = new Map<string, string>()

/** Icon as a data URL, padded to a square so it scales uniformly in the DOM. */
const toIconUrl = (key: string, build: () => PixelSprite) => {
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

export const candyIcon = (tier: number) => toIconUrl(`candy:${tier}`, () => PICKUPS.candy()[tier]!)
export const berryIcon = () => toIconUrl('berry', PICKUPS.berry)
export const pokeballIcon = () => toIconUrl('pokeball', PICKUPS.pokeball)
