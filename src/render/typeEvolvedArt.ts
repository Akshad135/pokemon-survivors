import type { Palette } from '../engine/pixelart'

/**
 * Pixel rows and palettes for the moves the newer type items evolve
 * (`game/typeEvolutions.ts`). Plain data with no canvas, so both `art.ts`
 * (icons) and `typeEvolved.ts` (the effects) build sprites from it without
 * importing each other. Some shapes are generated (pinwheel, heart, crescent)
 * into the same string rows, hard-edged like the hand-written ones.
 */

export type Rows = readonly string[]
export type ArtSpec = readonly [Rows, Palette]

/* ---------------- Generated shapes ---------------- */

/** Rows of `size`×`size` from a per-pixel picker (offsets from the center, '.' = empty). */
const plot = (size: number, pick: (dx: number, dy: number) => string): Rows => {
  const c = (size - 1) / 2
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => pick(x - c, y - c)).join(''))
}

/** Four curved blades around a hole: 1 rim, 2 water, 3 leading edge, 4 shine. */
export const PINWHEEL = plot(15, (dx, dy) => {
  const r = Math.hypot(dx, dy)
  if (r > 7.3 || r < 1.4) return '.'
  const turn = ((((Math.atan2(dy, dx) / (Math.PI * 2)) * 4 + r * 0.075) % 1) + 1) % 1
  if (r < 2.6) return '4'
  if (turn > 0.46) return '.'
  if (turn < 0.1) return '3'
  return r > 6.2 ? '1' : '2'
})

/** A heart outline two pixels thick, `size` wide: 1 outer, 2 inner. */
export const heartRing = (size: number): Rows =>
  plot(size, (dx, dy) => {
    const s = size / 2.3
    const inside = (k: number) => {
      const x = dx / (s * k)
      const y = -(dy / (s * k)) + 0.25
      return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0
    }
    if (!inside(1)) return '.'
    if (!inside(0.86)) return '1'
    return inside(0.72) ? '.' : '2'
  })

/** A crescent opening to the left (a slash or a wave crest): 1 edge, 2 body, 3 foam. */
export const CRESCENT = plot(13, (dx, dy) => {
  const outer = Math.hypot(dx, dy) <= 6.2
  const bite = Math.hypot(dx + 3.2, dy) <= 5.4
  if (!outer || bite) return '.'
  const r = Math.hypot(dx, dy)
  return r > 5.3 ? '3' : Math.hypot(dx + 3.2, dy) < 6.4 ? '1' : '2'
})

/* ---------------- Effect sprites ---------------- */

/** Jaw Lock's maw: an arched upper jaw with red eyes over a bowl-shaped lower one. 1 rim, 2 shadow, 3 sheen, 4 eyes, 5 gums, 6 fangs. */
export const MAW_TOP: Rows = ['.....1111111.....', '...11333333311...', '..1224222224221..', '.122222222222221.', '12222222222222221', '15555555555555551', '.66.66.666.66.66.', '.6...6..6..6...6.', '.6.............6.']
export const MAW_BOTTOM: Rows = ['.6.............6.', '.66..6..6..6..66.', '15555555555555551', '12222222222222221', '.122222222222221.', '..1122222222211..', '....111111111....']
export const MAW: Palette = { 1: '#0c0610', 2: '#3a2450', 3: '#6a4890', 4: '#ff4050', 5: '#a01830', 6: '#ffffff' }

/** Superpower's fist, knuckles to the right: four curled fingers and the thumb across. 1 lines, 2 glove, 3 light, 4 knuckle shine, 5 thumb. */
export const BIG_FIST: Rows = [
  '...111111111.', '..12222223441', '.122222221111', '1222222223441', '1222222221111',
  '1222222223441', '1222222221111', '1222255553441', '.12255555511.', '..111111111..',
]
export const FIST_PAL: Palette = { 1: '#401010', 2: '#d84030', 3: '#f07050', 4: '#ffd0b0', 5: '#a02018' }

/** Extrasensory's eye: 1 lid, 2 white, 3 iris, 4 iris shade, 5 pupil. */
export const EYE: Rows = ['....11111....', '..112222211..', '.12223332221.', '1222345432221', '.12223332221.', '..112222211..', '....11111....']
export const EYE_PAL: Palette = { 1: '#a02868', 2: '#fff0f8', 3: '#f85888', 4: '#a02060', 5: '#200818' }

/** One pixel of Steel Beam's length, across: dark edge to white core. */
export const BEAM_CROSS: Rows = ['1', '2', '3', '4', '4', '4', '3', '2', '1']
export const STEEL: Palette = { 1: '#404858', 2: '#8890a8', 3: '#c8d0e0', 4: '#ffffff' }

/** Infernal Parade's ghost flame with eyes: 1 rim, 2 body, 3 glow, 4 core, 5 eyes. */
export const PARADE_FLAME: Rows = [
  '....1....', '...12....', '...121...', '..12321..', '.1233321.', '.1234321.',
  '123535321', '123535321', '123343321', '.1233321.', '..12221..', '...111...',
]
export const PARADE_PAL: Palette = { 1: '#382070', 2: '#7048c0', 3: '#b090f0', 4: '#f0e0ff', 5: '#180828' }

/** Phantom Force's arrow, pointing down: 5 fletching, 2 shaft, 3 head, 4 shine. */
export const SPECTRAL_ARROW: Rows = ['5...5', '55.55', '.555.', '..2..', '..2..', '..2..', '..2..', '..2..', '..2..', '.323.', '33433', '.343.', '..3..']
export const SPECTRAL_PAL: Palette = { 2: '#a070d8', 3: '#c8f0d8', 4: '#ffffff', 5: '#58d888' }
export const AQUA: Palette = { 1: '#2050c0', 2: '#58a0f0', 3: '#c8ecff', 4: '#ffffff' }

/** Searing Shot's white-hot ball and its embers: 1 rim, 2 flame, 3 gold, 4 white. */
export const SEARING_BALL: Rows = ['...1111...', '..122221..', '.12333321.', '1233443321', '1234444321', '1234444321', '1233443321', '.12333321.', '..122221..', '...1111...']
export const SEARING_EMBER: Rows = ['.111.', '12321', '13431', '12321', '.111.']
export const SEARING_PAL: Palette = { 1: '#c02010', 2: '#f07020', 3: '#f8d040', 4: '#ffffff' }

/** Burning Jealousy's flame: 1 rim, 2 flame, 3 light, 4 core. */
export const ENVY_FLAME: Rows = [
  '....1....', '....1....', '...121...', '...121...', '..12321..', '..12321..', '.1233321.',
  '.1234321.', '123444321', '123444321', '.1234321.', '.1233321.', '..11111..',
]
export const ENVY_PAL: Palette = { 1: '#801868', 2: '#d03898', 3: '#f878c8', 4: '#fff0f8' }

/** Trailblaze's giant leaf blade, tip to the upper right: 1 rim, 2 leaf, 3 edge light. */
export const GIANT_BLADE: Rows = ['.............11', '...........1121', '........1112231', '.....11122331..', '...112233311...', '.11223311......', '12331..........', '11.............']
export const BLADE_PAL: Palette = { 1: '#286018', 2: '#88d048', 3: '#f0ffc0' }

export const WAVE_PAL: Palette = { 1: '#1838a0', 2: '#4878e8', 3: '#e8f8ff' }
export const HEART_PAL: Palette = { 1: '#c03878', 2: '#f8a8d0' }

/* ---------------- Icons ---------------- */

/** Giga Drain: a green orb with a glint. */
export const DRAIN_ORB: Rows = ['....1....', '...121...', '..11211..', '.1223221.', '122344321', '123444321', '122344221', '.1222221.', '..11111..']
export const DRAIN_PAL: Palette = { 1: '#205818', 2: '#58b838', 3: '#a8e870', 4: '#f0fff0' }

/** Fissure: a slab of ground split by a glowing crack. */
export const FISSURE_ICON: ArtSpec = [
  ['2222122222', '2222112222', '2222231222', '2221331222', '2213312222', '2221332222', '2222133122', '2222213222', '2222113222', '2222122222'],
  { 1: '#281808', 2: '#c09050', 3: '#f8a040' },
]

/** Steel Beam: a muzzle and its beam. */
export const BEAM_ICON: ArtSpec = [['..111.......', '.12221111111', '123443333333', '123444444444', '123443333333', '.12221111111', '..111.......'], STEEL]

