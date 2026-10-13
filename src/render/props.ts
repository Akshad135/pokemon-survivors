import { blitCentered, ellipse, fromStrings, ring, type Palette, type PixelSprite } from '../engine/pixelart'
import { REPEL_RADIUS } from '../data/consumables'
import { isAsleep, type ConsumableId } from '../game/consumables'
import type { Prop } from '../game/props'
import type { Game } from '../game/types'
import { art, lazy, toIconUrl } from './art'

/**
 * Pixel art and drawing for item sources (props), consumables on the floor,
 * and their world effects (Zzz, Max Repel aura, Explosion flash).
 */

type Ctx = CanvasRenderingContext2D

/* ---------------- Consumables ---------------- */

const BOTTLE = ['..111..', '..121..', '..343..', '.34443.', '3544443', '3566663', '3544443', '3444443', '.33333.']
const bottle = (dark: string, liquid: string, light: string, label = '#f8f8f8', cap = '#606070'): Palette => ({
  1: cap, 2: '#c8c8d8', 3: dark, 4: liquid, 5: light, 6: label,
})

const CONSUMABLE_ART: Record<ConsumableId, readonly [readonly string[], Palette]> = {
  potion: [BOTTLE, bottle('#602890', '#a048d8', '#e0b0ff')],
  superPotion: [BOTTLE, bottle('#a04810', '#f89830', '#ffe0a0')],
  maxRepel: [BOTTLE, bottle('#206828', '#48b848', '#b0f0a0')],
  xAttack: [BOTTLE, bottle('#901818', '#e83838', '#ffa0a0', '#f8e030', '#f8e030')],
  xSpeed: [BOTTLE, bottle('#184890', '#3880f0', '#a8d0ff', '#f8e030', '#f8e030')],
  rareCandy: [['1..222..1', '132422231', '132222231', '132222231', '1..222..1'], { 1: '#2850a8', 2: '#4878e0', 3: '#78a8f8', 4: '#ffffff' }],
  expShare: [['.....1.', '.....1.', '1111111', '1222221', '1233321', '1233321', '1222221', '1111111'], { 1: '#383848', 2: '#e84848', 3: '#f0f0f8' }],
  pokeFlute: [['11111111111', '14444444441', '12232323221', '11111111111'], { 1: '#204890', 2: '#78b0f8', 3: '#102040', 4: '#c8e0ff' }],
  explosion: [
    ['..11111..', '.1611111.', '161111111', '114515411', '111111111', '222222222', '333333333', '.3333333.', '..33333..'],
    { 1: '#e83030', 2: '#802020', 3: '#f0f0f0', 4: '#ffffff', 5: '#181818', 6: '#f8a0a0' },
  ],
  revive: [['...1...', '..121..', '.12321.', '1233321', '.12321.', '..121..', '...1...'], { 1: '#c08800', 2: '#f8d030', 3: '#fff8c8' }],
}

const consumableSprites = new Map<ConsumableId, PixelSprite>()

export const consumableSprite = (id: ConsumableId) => {
  let sprite = consumableSprites.get(id)
  if (!sprite) consumableSprites.set(id, (sprite = art(...CONSUMABLE_ART[id], '#181818')))
  return sprite
}

export const consumableIcon = (id: ConsumableId) => toIconUrl(`consumable:${id}`, () => consumableSprite(id))

/* ---------------- Props ---------------- */

const ITEM_BALL = [
  '...1111...', '.11222211.', '.12522221.', '1252222221', '1111331111',
  '1444334441', '1444444461', '.14444461.', '.11446611.', '...1111...',
]
const BERRY_TREE = [
  '....11111....', '..112222211..', '.12223222221.', '.12242222421.', '1222222232221', '1224222222421',
  '1222223222221', '.12422222241.', '.11222222211.', '...1115111...', '.....565.....', '.....565.....', '....55655....',
]
const GRASS_BASE = ['1221222112221', '1222222222221', '2222322223222', '2222222222222', '.22222222222.']
const GRASS_REST = ['.1...1....1..', '.12..21..121.', '121.1221.1221', ...GRASS_BASE]
const GRASS_RUSTLE = ['..1...1....1.', '..12..21..121', '.121.1221.122', ...GRASS_BASE]
const GRASS_PAL = { 1: '#2a6e34', 2: '#4f9e48', 3: '#78c060' }

const PROP_ART = lazy(() => ({
  itemBall: fromStrings(ITEM_BALL, { 1: '#202028', 2: '#e83838', 3: '#ffffff', 4: '#f0f0f0', 5: '#f8a8a8', 6: '#b8b8c8' }),
  berryTree: art(BERRY_TREE, { 1: '#205828', 2: '#48a038', 3: '#88d058', 4: '#3870d8', 5: '#604020', 6: '#a06838' }, '#142c14'),
  grass: [art(GRASS_REST, GRASS_PAL, '#1a4420'), art(GRASS_RUSTLE, GRASS_PAL, '#1a4420')],
}))

const SPARKLE = lazy(() => fromStrings(['.1.', '121', '.1.'], { 1: '#fff8c0', 2: '#ffffff' }))

const drawProp = (ctx: Ctx, prop: Prop, t: number) => {
  const sprites = PROP_ART()
  const wobble = prop.shake > 0 ? (Math.floor(prop.shake * 40) % 2 ? 1 : -1) : 0
  const x = prop.x + wobble
  switch (prop.kind) {
    case 'itemBall': {
      blitCentered(ctx, ellipse(5, 1, 'rgba(16,40,16,0.3)'), prop.x, prop.y)
      blitCentered(ctx, sprites.itemBall, x, prop.y - 5)
      if ((t + prop.id * 0.29) % 1.6 < 0.2) blitCentered(ctx, SPARKLE(), x - 3, prop.y - 8)
      return
    }
    case 'berryTree': {
      blitCentered(ctx, ellipse(7, 2, 'rgba(16,40,16,0.3)'), prop.x, prop.y)
      const s = sprites.berryTree
      return ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(prop.y - s.height + 1))
    }
    case 'tallGrass': {
      // Rustles in short bursts, like grass hiding a wild Pokémon.
      const rustling = prop.shake > 0 || (t + prop.id * 0.37) % 2.2 < 0.5
      const s = sprites.grass[rustling && Math.floor(t * 10) % 2 ? 1 : 0]!
      return ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(prop.y - s.height + 1))
    }
  }
}

const near = (g: Game, x: number, y: number, m = 32) =>
  x > g.camera.x - m && x < g.camera.x + g.view.w + m && y > g.camera.y - m && y < g.camera.y + g.view.h + m * 2

/** Ground layer: item sources and the Max Repel aura. */
export const drawProps = (ctx: Ctx, g: Game, t: number) => {
  for (const prop of g.props) if (near(g, prop.x, prop.y)) drawProp(ctx, prop, t)

  const repel = g.buffs.find((b) => b.id === 'maxRepel')
  if (repel && (repel.left > 1.5 || Math.floor(t * 8) % 2 === 0)) {
    const p = g.player
    ctx.globalAlpha = 0.7 + Math.sin(t * 6) * 0.2
    blitCentered(ctx, ellipse(REPEL_RADIUS, Math.round(REPEL_RADIUS * 0.5), 'rgba(88,216,120,0.3)'), p.x, p.y)
    blitCentered(ctx, ring(REPEL_RADIUS - 4 + Math.round(Math.sin(t * 4) * 2), 1, '#b0f0a0'), p.x, p.y - 8)
    ctx.globalAlpha = 1
  }
}

/** A consumable lying on the floor, with a twinkle so it stands out from Exp. Candies. */
export const drawConsumable = (ctx: Ctx, id: ConsumableId, x: number, y: number, seed: number, t: number) => {
  blitCentered(ctx, consumableSprite(id), x, y)
  if ((t * 1.3 + seed * 0.17) % 1 < 0.15) blitCentered(ctx, SPARKLE(), x + 4, y - 4)
}

/* ---------------- Effects ---------------- */

const ZZZ = lazy(() => [
  art(['1111', '..1.', '.1..', '1111'], { 1: '#ffffff' }, '#283868'),
  art(['111', '.1.', '111'], { 1: '#c8d8ff' }, '#283868'),
])

/** Floating "Zzz" over every visible sleeping enemy (Poké Flute). */
export const drawSleep = (ctx: Ctx, g: Game, t: number) => {
  const [big, small] = ZZZ()
  for (const e of g.enemies) {
    if (e.dying >= 0 || !isAsleep(e, g.time) || !near(g, e.x, e.y, 0)) continue
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.7 + e.id * 0.31 + k * 0.5) % 1
      ctx.globalAlpha = Math.min(1, (1 - ph) * 2)
      blitCentered(ctx, k ? small! : big!, e.x + e.radius + ph * 6 + Math.sin(ph * 6) * 2, e.y - e.radius * 2 - 2 - ph * 12)
    }
  }
  ctx.globalAlpha = 1
}

/** Full-screen white flash (Explosion). Drawn in screen space. */
export const drawFlash = (ctx: Ctx, g: Game) => {
  if (g.flash <= 0) return
  ctx.fillStyle = `rgba(255,255,255,${Math.min(1, g.flash).toFixed(2)})`
  ctx.fillRect(0, 0, g.view.w, g.view.h)
}
