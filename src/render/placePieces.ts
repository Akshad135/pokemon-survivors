import type { PlacePiece } from '../data/places'
import { cylinder, grid, lathe, limb, noise, outline, put, sculpt, shade, shard, stamp, toSprite, type Grid, type Ramp } from './sculpt'
import { deadTree, stalagmites, TOWER_TREE, type Piece } from './terrain'

/**
 * Places' scenery (`data/places.ts`), sculpted in code like the map's
 * terrain: the entrances on the map (a cave mouth in a rocky hill, a
 * graveyard's gate, the updraft's standing stones) and what stands inside.
 * Built on first sight and cached by `render/terrain.ts`.
 */

const piece = (g: Grid, ax: number, ay: number): Piece => ({ sprite: toSprite(g), ax: Math.round(ax), ay: Math.round(ay) })

const HILL: Ramp = ['#2a2224', '#463a38', '#665650', '#867468', '#a8968a']
const MOSS: Ramp = ['#2c5a2a', '#447c38', '#62a048']
const WOOD: Ramp = ['#3c2414', '#5c3c20', '#7c5430', '#9c6c40']
const GRAVE: Ramp = ['#2c2638', '#4a4258', '#6a6280', '#8e86a4', '#b0a8c4']
const IRON: Ramp = ['#14121c', '#2a2634', '#46404e', '#625a6c']

/** The cave's mouth: a mossy rocky hill with a beam-framed arch going down into the dark. Anchored at the arch's foot. */
const caveMouth = (): Piece => {
  const g = grid(128, 82)
  const cx = 64
  const ground = 72
  sculpt(
    g,
    [
      { x: cx, y: 42, rx: 52, ry: 32 },
      { x: cx + 8, y: 22, rx: 24, ry: 15 },
      { x: cx - 36, y: 56, rx: 28, ry: 20 },
      { x: cx + 34, y: 56, rx: 28, ry: 20 },
      { x: cx - 44, y: 67, rx: 14, ry: 9 },
      { x: cx + 42, y: 67, rx: 13, ry: 8 },
    ],
    HILL,
    {
      facets: 2.5,
      seed: 7,
      rough: 0.12,
      paint: (x, y, n, light) => (n.y < -0.45 && noise(x, y, 11) < 0.8 ? shade(MOSS, light, x, y) : null),
    },
  )
  // The arch, deepening toward its middle, with steps going down.
  const half = 15
  const top = 48
  for (let y = top - half; y <= ground; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - top
      if (y < top && dx * dx + dy * dy > half * half) continue
      const edge = Math.min(half - Math.abs(dx), y < top ? half - Math.sqrt(dx * dx + dy * dy) : Infinity)
      const step = y > ground - 12 && (ground - y) % 4 === 0 && Math.abs(dx) < half - 3
      put(g, x, y, step ? '#2c2220' : edge < 2 ? '#1c1414' : edge < 5 ? '#120c0c' : '#080404')
    }
  }
  // Mine beams: two posts and a lintel.
  for (const px of [cx - half - 2, cx + half + 1]) limb(g, px, ground, px, top - 9, 1.6, 1.6, WOOD)
  limb(g, cx - half - 5, top - 10, cx + half + 4, top - 10, 1.7, 1.7, WOOD)
  stamp(g, ['11', '22'], { 1: '#2c1c10', 2: '#5c3c20' }, cx - half - 3, top - 7)
  outline(g, '#140e10')
  return piece(g, cx, ground)
}

/** The graveyard's gate: stone pillars, an iron arch and open gates, the fence running off both sides and graves behind it. Anchored at the gate's foot. */
const graveGate = (): Piece => {
  const g = grid(164, 86)
  const cx = 82
  const ground = 76
  // Behind the fence: a few graves and a bare tree, in the fog.
  for (const [x, y, h] of [[34, 56, 9], [56, 50, 8], [110, 52, 9], [132, 57, 8], [76, 46, 7]] as const) {
    for (let dy = 0; dy < h; dy++) {
      const w = dy < 2 ? 3 : 4
      for (let dx = -w; dx <= w; dx++) put(g, x + dx, y - dy, shade(GRAVE, dx < 0 ? 0.65 : 0.3, x + dx, y - dy))
    }
  }
  limb(g, 146, 56, 145, 34, 2, 1.2, TOWER_TREE.trunk)
  limb(g, 145, 40, 136, 30, 1.1, 0.6, TOWER_TREE.trunk)
  limb(g, 145, 36, 153, 27, 1, 0.5, TOWER_TREE.trunk)
  // The fence: bars with spear tips on two rails.
  for (let x = 6; x <= g.w - 7; x++) {
    if (Math.abs(x - cx) < 26) continue
    const bar = x % 4 === 0
    for (let y = ground - 16; y <= ground; y++) {
      const rail = y === ground - 3 || y === ground - 12
      if (bar || rail) put(g, x, y, shade(IRON, bar ? 0.75 : 0.45, x, y))
    }
    if (bar) {
      put(g, x, ground - 17, IRON[3]!)
      put(g, x, ground - 18, IRON[2]!)
    }
  }
  // The open gates, swung in against the pillars.
  for (const side of [-1, 1]) {
    const x0 = cx + side * 15
    for (let i = 0; i < 4; i++) {
      const x = x0 - side * i * 2
      for (let y = ground - 22 + i; y <= ground - 1 - i; y++) put(g, x, y, shade(IRON, 0.6, x, y))
    }
  }
  // Pillars with caps and a stone ball on each.
  for (const px of [cx - 20, cx + 20]) {
    cylinder(g, px, ground, 5.5, 30, GRAVE, { top: null })
    cylinder(g, px, ground - 30, 7, 3, GRAVE, { ry: 2.5 })
    sculpt(g, [{ x: px, y: ground - 37, rx: 3.5, ry: 3.5 }], GRAVE, { tag: 40 })
  }
  // The iron arch between them, with a scroll in the middle.
  for (let x = cx - 16; x <= cx + 16; x++) {
    const t = (x - cx) / 16
    const y = Math.round(ground - 30 - 8 * (1 - t * t))
    put(g, x, y, IRON[3]!)
    put(g, x, y + 1, IRON[1]!)
  }
  stamp(g, ['.111.', '12.21', '1.3.1', '12.21', '.111.'], { 1: IRON[2]!, 2: IRON[3]!, 3: '#a890e8' }, cx - 2, ground - 42)
  outline(g, '#0c0814')
  return piece(g, cx, ground)
}

/** One of the updraft's four standing stones: a pale menhir with a carved swirl and a ribbon on top. */
const windStone = (variant: number): Piece => {
  const g = grid(16, 30)
  const cx = 8
  const ground = 27
  const stone: Ramp = ['#3c4458', '#5c6680', '#7e88a0', '#a4acc0', '#d0d6e4']
  lathe(g, cx, ground, 20, (t) => 4.5 - t * 1.6 + (t > 0.9 ? -(t - 0.9) * 18 : 0), stone, { ry: 0.45 })
  // A carved swirl, glowing faintly.
  stamp(g, ['.11', '1..', '.1.', '..1', '11.'], { 1: '#78d8f8' }, cx - 1, ground - 15)
  // The ribbon tied around its top, blowing in the wind.
  const ribbon = variant % 2 === 0 ? '#f8f8ff' : '#a8e0f8'
  stamp(g, ['111', '.111', '..11', '...1'], { 1: ribbon }, cx, ground - 21)
  outline(g, '#141a28')
  return piece(g, cx, ground)
}

const CAVE_STONE = { stone: ['#1e1614', '#3a2c26', '#5a463c', '#7a6250', '#9a806a'], outline: '#0c0806' }

/** A cluster of glowing crystal shards (the dungeon's light), blue, violet or green. */
const crystal = (variant: number): Piece => {
  const g = grid(22, 24)
  const cx = 11
  const ground = 21
  const hues: readonly Ramp[] = [
    ['#183868', '#2c68b0', '#58a8e8', '#a8e0ff', '#ffffff'],
    ['#3c1868', '#6c34b0', '#a070e8', '#d8b8ff', '#ffffff'],
    ['#185838', '#2c9060', '#58d098', '#b0f8d0', '#ffffff'],
  ]
  const ramp = hues[variant % hues.length]!
  sculpt(g, [{ x: cx, y: ground, rx: 7, ry: 3 }], CAVE_STONE.stone, { facets: 2 })
  shard(g, cx - 4, ground, 9, 3.5, -0.45, ramp)
  shard(g, cx + 4, ground, 8, 3, 0.5, ramp)
  shard(g, cx, ground, 15, 4.5, 0.05, ramp)
  outline(g, '#080810')
  return piece(g, cx, ground)
}

/** The Mystery Dungeon's treasure: a red wooden chest with gold trim (open once looted). */
const chest = (variant: number): Piece => {
  const closed = [
    '..11111111111111..',
    '.1222222222222221.',
    '1233333333333333321',
    '1244444444444444421',
    '1255555555555555521',
    '1111111166111111111',
    '1233333367733333321',
    '1244444467744444421',
    '1244444466644444421',
    '1255555555555555521',
    '1255555555555555521',
    '1111111111111111111',
  ]
  const open = [
    '..1111111111111111..',
    '.122222222222222221.',
    '1233333333333333321.',
    '1111111111111111111.',
    '1888888888888888881.',
    '1899999999999999981.',
    '1233333367733333321.',
    '1244444467744444421.',
    '1244444466644444421.',
    '1255555555555555521.',
    '1255555555555555521.',
    '1111111111111111111.',
  ]
  const rows = variant === 1 ? open : closed
  const g = grid(22, 16)
  stamp(g, rows, { 1: '#2c1008', 2: '#f8d878', 3: '#c83828', 4: '#a02818', 5: '#781c10', 6: '#f8d030', 7: '#7c5000', 8: '#401810', 9: '#f8e8a0' }, 1, 2)
  outline(g, '#140604')
  return piece(g, 10, 14)
}

/** A rounded headstone with an engraved line and moss at its foot; some lean or are chipped. */
const tombstone = (variant: number): Piece => {
  const g = grid(18, 22)
  const cx = 9
  const ground = 19
  const lean = ((variant % 3) - 1) * 0.08
  for (let y = ground - 15; y <= ground; y++) {
    const e = ground - y
    const w = e > 11 ? Math.round(Math.sqrt(Math.max(0, 16 - (e - 11) * (e - 11)))) + 1 : 5
    const ox = Math.round(e * lean * 3)
    for (let dx = -w; dx <= w; dx++) {
      const x = cx + dx + ox
      if (variant % 4 === 3 && e > 12 && dx > 1) continue
      const light = dx < -w + 2 ? 0.85 : dx > w - 2 ? 0.25 : 0.55
      put(g, x, y, shade(GRAVE, light + (noise(x, y, variant) - 0.5) * 0.15, x, y))
    }
  }
  for (const [y, w] of [[ground - 10, 2], [ground - 7, 3]] as const) for (let dx = -w; dx <= w; dx++) put(g, cx + dx + Math.round((ground - y) * lean * 3), y, GRAVE[1]!)
  for (let dx = -6; dx <= 6; dx++) if (noise(dx, variant, 3) < 0.7) put(g, cx + dx, ground + 1, shade(MOSS, 0.4, cx + dx, ground))
  outline(g, '#0c0814')
  return piece(g, cx, ground)
}

/** A stone cross on a little plinth. */
const graveCross = (variant: number): Piece => {
  const g = grid(14, 24)
  const cx = 7
  const ground = 21
  const ramp = variant % 2 === 0 ? GRAVE : WOOD
  for (let y = ground - 17; y <= ground - 2; y++) for (let dx = -1; dx <= 1; dx++) put(g, cx + dx, y, shade(ramp, dx < 0 ? 0.8 : 0.35, cx + dx, y))
  for (let x = cx - 5; x <= cx + 5; x++) for (const y of [ground - 13, ground - 12]) put(g, x, y, shade(ramp, y === ground - 13 ? 0.75 : 0.4, x, y))
  for (let x = cx - 3; x <= cx + 3; x++) for (const y of [ground - 1, ground]) put(g, x, y, shade(GRAVE, 0.45, x, y))
  outline(g, '#0c0814')
  return piece(g, cx, ground)
}

/** The Odd Keystone on its plinth, a face in its cracks; split open once Spiritomb breaks out. */
const keystone = (variant: number): Piece => {
  const g = grid(30, 34)
  const cx = 15
  const ground = 30
  cylinder(g, cx, ground, 11, 5, GRAVE, { ry: 4.5 })
  const stone: Ramp = ['#181420', '#2c2638', '#443c54', '#5c5270', '#7c7090']
  if (variant === 1) {
    sculpt(g, [{ x: cx - 6, y: ground - 7, rx: 5, ry: 3.5 }, { x: cx + 6, y: ground - 6, rx: 4.5, ry: 3 }, { x: cx + 1, y: ground - 5, rx: 3, ry: 2 }], stone, { facets: 2 })
  } else {
    sculpt(g, [{ x: cx, y: ground - 14, rx: 8.5, ry: 9.5, p: 3 }], stone, { facets: 3, seed: 4 })
    // Its swirling face: the 108 spirits inside.
    stamp(g, ['1...1', '.....', '..2..', '.222.', '2...2'], { 1: '#d8c8f8', 2: '#7860a8' }, cx - 2, ground - 18)
    stamp(g, ['3.3.3', '.3.3.'], { 3: '#100c18' }, cx - 2, ground - 9)
  }
  outline(g, '#08060c')
  return piece(g, cx, ground)
}

export const PLACE_PIECES: Record<PlacePiece, (variant: number) => Piece> = {
  caveMouth,
  graveGate,
  windStone,
  caveRock: (v) => stalagmites(CAVE_STONE, v + 5),
  crystal,
  chest,
  tombstone,
  graveCross,
  deadTree: () => deadTree(TOWER_TREE),
  keystone,
}

/** Shadow width of each piece, and which ones are tall enough to go see-through. */
export const PLACE_SHADOW: Record<PlacePiece, number> = {
  caveMouth: 0,
  graveGate: 0,
  windStone: 6,
  caveRock: 8,
  crystal: 7,
  chest: 11,
  tombstone: 7,
  graveCross: 5,
  deadTree: 9,
  keystone: 12,
}

export const PLACE_TALL: Record<PlacePiece, boolean> = {
  caveMouth: true,
  graveGate: false,
  windStone: false,
  caveRock: true,
  crystal: false,
  chest: false,
  tombstone: false,
  graveCross: false,
  deadTree: true,
  keystone: false,
}
