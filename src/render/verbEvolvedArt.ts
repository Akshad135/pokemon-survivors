import { context2d, createCanvas, fromStrings, lazy, type Palette, type PixelSprite } from '../engine/pixelart'
import type { VerbEvolvedMoveId } from '../game/verbEvolutions'

/**
 * Pixel art of the verb moves' evolutions (`render/verbEvolvedFx.ts` draws
 * them, `art.ts` lists the icons). String sprites like `art.ts`; the round
 * shapes (gears, the lance, Hoopa's ring, the blast star) are generated into
 * the same hard-edged rows. Built lazily (the DOM canvas only exists at
 * render time). `art.ts` imports this file, so it keeps its own outline.
 */

type Rows = readonly string[]

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

const sprite = (rows: Rows, palette: Palette, outline?: string) => {
  const s = fromStrings(rows, palette)
  return outline ? outlined(s, outline) : s
}

/** Layers sprites on one canvas (cluster icons). */
const compose = (w: number, h: number, layers: ReadonlyArray<readonly [PixelSprite, number, number]>) => {
  const canvas = createCanvas(w, h)
  const ctx = context2d(canvas)
  for (const [s, x, y] of layers) ctx.drawImage(s, x, y)
  return canvas
}

/** Rows of `w`×`h` from a per-pixel picker ('.' = empty). */
const plot = (w: number, h: number, pick: (x: number, y: number) => string): Rows =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => pick(x, y)).join(''))

/** The rows turned a quarter clockwise (a fist pointing right now points down). */
const turn = (rows: Rows): Rows => Array.from({ length: rows[0]!.length }, (_, x) => rows.map((r) => r[x]!).reverse().join(''))
const mirror = (rows: Rows): Rows => rows.map((r) => [...r].reverse().join(''))

/* ---------------- Palettes ---------------- */

export const FURY_PAL = { 1: '#a01808', 2: '#e84818', 3: '#f8a028', 4: '#fff4b0' }
const SEED_PAL = { 1: '#286818', 2: '#58b838', 3: '#d8f888', 4: '#ffffff' }
const SUN_PAL = { 1: '#e8a020', 2: '#f8d850', 3: '#fff8b0', 4: '#ffffff' }
const DROP_PAL = { 1: '#2850a8', 2: '#4888e0', 3: '#88c0f8', 4: '#ffffff' }
const NEON_PAL = { 1: '#381870', 2: '#8040f8', 3: '#58e8f8', 4: '#ffffff' }
const SLUDGE_PAL = { 1: '#381040', 2: '#9038a0', 3: '#d080e0', 4: '#b8f060' }
const BLAST_PAL = { 1: '#a82010', 2: '#e85818', 3: '#f8c030', 4: '#ffffff' }
const WING_PAL = { 1: '#180810', 2: '#701428', 3: '#c02838', 4: '#f86868' }
const UPPER_PAL = { 1: '#601008', 2: '#c03020', 3: '#e85840', 4: '#ffb8a0' }
const GEAR_PAL = { 1: '#505068', 2: '#a8a8c0', 3: '#e8e8f8', 4: '#181820', 5: '#787890' }
const BLADE_PAL = { 1: '#100810', 3: '#b0b0c8', 4: '#f8d860', 5: '#a02030', 6: '#382838' }
const RING_PAL = { 1: '#805000', 2: '#f8c830', 3: '#fff8b0', 4: '#301040', 5: '#f85888' }
const ARROW_PAL = { 1: '#0c3818', 2: '#30a048', 3: '#a8f0a0', 4: '#e8ffe0' }
const AXE_PAL = { 1: '#282420', 2: '#a09888', 3: '#f4ece0', 4: '#686058', 5: '#c8a060', 6: '#9a6838', 7: '#5a3818' }
const BUG_PAL = { 1: '#506010', 2: '#a8b820', 3: '#e0f080', 4: '#f8d030' }
const DRAGON_PAL = { 1: '#200868', 2: '#7038f8', 3: '#b898ff', 4: '#ffffff' }
const ICE_PAL = { 1: '#285880', 2: '#68a8d8', 3: '#c8e8ff', 4: '#ffffff' }

/* ---------------- Rows ---------------- */

/** A tall, wild flame (Raging Fury's cloak and road): 1 rim, 2 flame, 3 light, 4 core. */
export const FURY_FLAME: Rows = [
  '....1....', '...11....', '...121...', '..1221.1.', '..12221..', '.122321..', '.1233321.',
  '12334321.', '123443321', '123444321', '123444321', '.1234321.', '..11111..',
]
/** A seed of light: 1 rim, 2 green, 3 pale, 4 white. */
const SEED: Rows = ['..1..', '.121.', '12321', '13431', '12321', '.111.']
/** A heavy water drop. */
const DROP: Rows = ['...1...', '...1...', '..121..', '..131..', '.12321.', '1233421', '1234441', '1233341', '.12221.', '..111..']
/** Electro Drift's neon orb: 1 rim, 2 violet, 3 cyan, 4 core. */
const NEON: Rows = ['..11111..', '.1222221.', '122333221', '123344321', '123444321', '123344321', '122333221', '.1222221.', '..11111..']
/** A wave crest (Surf's shape) for Sludge Wave's icon. */
const WAVE: Rows = ['...11111..', '..1222221.', '.12233.121', '.1231...1.', '1223......', '12231...11', '1222311121', '.11111111.']
/** One crimson wing reaching left, its feathers hanging: 1 rim, 2 shade, 3 red, 4 light edge. */
const WING: Rows = [
  '11..............', '1411............', '14341111........', '.143334441111...', '.14322233334411.',
  '..14322222223311', '..14212122222221', '...1411411222211', '...11.11.111111.',
]
/** Sky Uppercut's fist, knuckles up, thumb folded across: 1 rim, 2 skin shade, 3 skin, 4 knuckle light. */
const UP_FIST: Rows = [
  '.11.11.11.', '1441441441', '1343343341', '1333333331', '1333333331', '1223333221', '1222112221', '.12222221.', '.12222221.', '..111111..',
]
/** Kowtow Cleave's blade on its hilt, cutting up and right: 1 rim, 3 steel, 4 gold edge, 5 red guard, 6 hilt. */
const BLADE: Rows = [
  '..........11', '.........141', '........1431', '.......1431.', '......1431..', '.....1431...',
  '....1431....', '.1.1431.....', '.1531.......', '..551.......', '.6.6........', '66..........',
]
/** A fletched arrow pointing right: 1 rim, 2 shaft, 3 light, 4 gold head. */
const ARROW: Rows = ['11..........1...', '121........1431.', '.123333333344441', '121........1431.', '11..........1...']
/**
 * Stone Axe, head up and its blade facing right: a wedge of stone lashed to
 * a wooden haft. 1 rim, 2 stone, 3 sharp edge, 4 shade, 5 lashing, 6 haft, 7 haft shade.
 */
const AXE: Rows = plot(14, 18, (x, y) => {
  const head = (px: number, py: number) => px >= 4 && px <= 12 && py >= 1 + (12 - px) * 0.28 && py <= 10 - (12 - px) * 0.32
  const haft = (px: number, py: number) => px >= 4 && px <= 5 && py >= 3 && py <= 16
  const inside = (px: number, py: number) => head(px, py) || haft(px, py)
  if (!inside(x, y)) return inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1) ? '1' : '.'
  if (head(x, y)) {
    if (x >= 11) return '3'
    if (x <= 5 && (y === 4 || y === 6)) return '5'
    return y > 7 - (12 - x) * 0.1 ? '4' : '2'
  }
  return x === 5 ? '7' : '6'
})
/** A splinter of stone. */
const SPLINTER: Rows = ['...1...', '..131..', '..1321.', '.13221.', '132224.', '.12244.', '.1244..', '..14...', '...1...']
/** First Impression's icon: an exclamation mark. */
const EXCLAIM: Rows = ['.111.', '14441', '14341', '14341', '14341', '.141.', '.141.', '..1..', '.....', '.111.', '.141.', '.111.']

/**
 * A gear of `size` px with `teeth` square teeth, turned by `rot` radians:
 * 1 rim, 2 steel, 3 shine (top left), 4 hole, 5 hub.
 */
const gearRows = (size: number, teeth: number, rot: number): Rows => {
  const c = (size - 1) / 2
  const inside = (x: number, y: number) => {
    const d = Math.hypot(x - c, y - c)
    const seg = ((((Math.atan2(y - c, x - c) + rot) / (Math.PI * 2)) * teeth) % 1 + 1) % 1
    return d <= c * 0.72 || (d <= c + 0.4 && seg < 0.45)
  }
  return plot(size, size, (x, y) => {
    if (!inside(x, y)) return '.'
    const d = Math.hypot(x - c, y - c)
    if (d < c * 0.18) return '4'
    if (d < c * 0.34) return '5'
    if (d > c * 0.42 && d < c * 0.5) return '1'
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) return '1'
    return x + y < 2 * c - c * 0.5 ? '3' : '2'
  })
}

/** Glacial Lance pointing right: a slim shaft, a guard and a long faceted point. 1 rim, 2 ice, 3 pale, 4 shine. */
const LANCE: Rows = plot(26, 7, (x, y) => {
  const dy = y - 3
  const half = x < 8 ? 1 : x < 10 ? 3 : 3 * (1 - (x - 10) / 16)
  if (Math.abs(dy) > half + 0.25) return '.'
  if (Math.abs(dy) > half - 0.75) return '1'
  if (x >= 10 && dy === -1) return '4'
  return dy < 0 ? '3' : '2'
})

/** A blast star of `size` px: 12 rays, white heart. 1 red, 2 orange, 3 yellow, 4 white. */
const blastRows = (size: number): Rows => {
  const c = (size - 1) / 2
  return plot(size, size, (x, y) => {
    const d = Math.hypot(x - c, y - c)
    const a = Math.atan2(y - c, x - c)
    const ray = Math.abs(Math.cos(a * 6))
    const reach = c * (0.42 + 0.58 * ray ** 6)
    if (d > reach) return '.'
    const k = d / reach
    return k < 0.3 ? '4' : k < 0.55 ? '3' : k < 0.8 ? '2' : '1'
  })
}

/** Hoopa's golden ring around a void, `w`×`h`: 1 rim, 2 gold, 3 shine, 4 void, 5 void glow. */
const ringRows = (w: number, h: number): Rows =>
  plot(w, h, (x, y) => {
    const nx = (x - (w - 1) / 2) / (w / 2)
    const ny = (y - (h - 1) / 2) / (h / 2)
    const d = Math.hypot(nx, ny)
    if (d > 1) return '.'
    if (d > 0.9) return '1'
    if (d > 0.68) return ny < -0.2 && nx < 0.3 ? '3' : '2'
    if (d > 0.6) return '1'
    return d > 0.45 ? '5' : '4'
  })

/** A sun disc with eight short rays: 1 deep gold, 2 gold, 3 pale, 4 white. */
const sunRows = (size: number): Rows => {
  const c = (size - 1) / 2
  return plot(size, size, (x, y) => {
    const d = Math.hypot(x - c, y - c)
    const a = Math.atan2(y - c, x - c)
    const ray = Math.abs(Math.cos(a * 4)) > 0.92 && d < c + 0.4
    if (d <= c * 0.55) return d < c * 0.25 ? '4' : d < c * 0.42 ? '3' : '2'
    if (d <= c * 0.65) return '1'
    return ray ? '2' : '.'
  })
}

/** A curl of tail swept three quarters round (Breaking Swipe's icon): 1 rim, 2 body, 3 light, 4 tip. */
const swirlRows = (size: number): Rows => {
  const c = (size - 1) / 2
  return plot(size, size, (x, y) => {
    const d = Math.hypot(x - c, y - c)
    const a = (Math.atan2(y - c, x - c) + Math.PI * 2.5) % (Math.PI * 2)
    const k = a / (Math.PI * 2)
    if (k > 0.82) return '.'
    const r0 = c * (0.45 + 0.4 * k)
    const w = 0.6 + 2.2 * k
    if (Math.abs(d - r0) > w) return '.'
    if (Math.abs(d - r0) > w - 0.9) return '1'
    return k > 0.7 ? '4' : d < r0 ? '3' : '2'
  })
}

/* ---------------- Sprites ---------------- */

export const VE = {
  /** Two frames of the fury flame (mirrored), for the cloak and the burning road. */
  furyFlame: lazy(() => [sprite(FURY_FLAME, FURY_PAL), sprite(mirror(FURY_FLAME), FURY_PAL)]),
  seed: lazy(() => sprite(SEED, SEED_PAL, '#103008')),
  drop: lazy(() => sprite(DROP, DROP_PAL, '#0c1c40')),
  neon: lazy(() => sprite(NEON, NEON_PAL, '#180830')),
  /** The left wing and the right one (mirrored). */
  wings: lazy(() => [sprite(WING, WING_PAL), sprite(mirror(WING), WING_PAL)]),
  /** Sky Uppercut's fist, pointing up. */
  upFist: lazy(() => sprite(UP_FIST, UPPER_PAL, '#fff0a0')),
  /** Four turns of the big gear (a fortieth of a turn apart each). */
  gear: lazy(() => [0, 1, 2, 3].map((k) => sprite(gearRows(23, 10, (k * Math.PI) / 20), GEAR_PAL, '#101018'))),
  blade: lazy(() => sprite(BLADE, BLADE_PAL)),
  arrow: lazy(() => sprite(ARROW, ARROW_PAL)),
  axe: lazy(() => sprite(AXE, AXE_PAL, '#181008')),
  splinters: lazy(() => [sprite(SPLINTER, AXE_PAL, '#181008'), sprite(mirror(SPLINTER), AXE_PAL, '#181008')]),
  lance: lazy(() => sprite(LANCE, ICE_PAL, '#102030')),
  exclaim: lazy(() => sprite(EXCLAIM, BUG_PAL, '#283008')),
  sun: lazy(() => sprite(sunRows(15), SUN_PAL)),
}

/* ---------------- Icons ---------------- */

export const VERB_EVOLVED_ICONS: Record<VerbEvolvedMoveId, () => PixelSprite> = {
  ragingFury: () => {
    const flame = sprite(FURY_FLAME, FURY_PAL, '#401008')
    const small = sprite(['..1..', '.121.', '12321', '12321', '.111.'], FURY_PAL, '#401008')
    return compose(16, 16, [[small, 0, 8], [small, 10, 7], [flame, 3, 0]])
  },
  seedFlare: () => compose(16, 16, [[sprite(sunRows(15), SUN_PAL, '#584010'), 0, 0], [VE.seed(), 9, 8]]),
  waterSpout: () => {
    const column = sprite(['.1111.', '123321', '.1221.', '.1231.', '.1221.', '.1321.', '112211', '122221', '111111'], DROP_PAL, '#0c1c40')
    return compose(16, 16, [[column, 4, 5], [VE.drop(), 0, 0], [VE.drop(), 10, 1]])
  },
  electroDrift: () => {
    const spark = sprite(['1.....', '.1....', '..11..', '....1.', '.....1'], { 1: '#58e8f8' })
    return compose(16, 16, [[VE.neon(), 0, 0], [spark, 7, 6], [VE.neon(), 5, 5]])
  },
  sludgeWave: () => sprite(WAVE, SLUDGE_PAL, '#200818'),
  explosion: () => sprite(blastRows(15), BLAST_PAL, '#401008'),
  oblivionWing: () => {
    const [l, r] = VE.wings()
    return compose(22, 10, [[l!, 0, 0], [r!, 6, 0]])
  },
  skyUppercut: () => {
    const lines = sprite(['1.1.1', '.....', '1.1.1'], { 1: '#f8d030' })
    return compose(12, 15, [[sprite(UP_FIST, UPPER_PAL, '#f8d030'), 0, 0], [lines, 3, 12]])
  },
  gearGrind: () => {
    const big = sprite(gearRows(11, 8, 0), GEAR_PAL, '#101018')
    const small = sprite(gearRows(8, 6, 0.3), GEAR_PAL, '#101018')
    return compose(17, 15, [[small, 9, 0], [big, 0, 3]])
  },
  kowtowCleave: () => outlined(fromStrings(BLADE, BLADE_PAL), '#e0d0f0'),
  hyperspaceHole: () => sprite(ringRows(15, 11), RING_PAL, '#281008'),
  thousandArrows: () => {
    const down = sprite(turn(ARROW), ARROW_PAL)
    return compose(16, 16, [[down, 0, 0], [down, 5, 3], [down, 10, 1]])
  },
  stoneAxe: () => sprite(AXE, AXE_PAL, '#181008'),
  firstImpression: () => {
    const burst = sprite(['1...1...1', '.1..1..1.', '..1...1..', '.........', '11.....11', '.........', '..1...1..', '.1.....1.', '1.......1'], { 1: '#a8b820' })
    return compose(11, 14, [[burst, 1, 2], [VE.exclaim(), 3, 0]])
  },
  breakingSwipe: () => sprite(swirlRows(15), DRAGON_PAL, '#100430'),
  glacialLance: () => {
    const rows = plot(15, 15, (x, y) => {
      const along = (x + (14 - y)) / 2
      const across = (x - (14 - y)) / 2
      const half = along < 4 ? 0.8 : along < 5 ? 2 : 2 * (1 - (along - 5) / 9.5)
      if (Math.abs(across) > half + 0.3 || along > 14.2) return '.'
      if (Math.abs(across) > half - 0.6) return '1'
      return across < 0 ? '3' : '2'
    })
    return sprite(rows, ICE_PAL, '#102030')
  },
}
