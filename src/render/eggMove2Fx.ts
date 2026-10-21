import { blitCentered, blitEllipse, blitRing, blitRotated } from '../engine/pixelart'
import { hash2 } from '../engine/rng'
import { TAU } from '../engine/math'
import { BALL_LOB, BRAVE, FALL_RISE, RESORT_WINDUP } from '../game/eggMove2Rules'
import type { Attack } from '../game/types'
import { EGG2_FX } from './eggMove2Art'
import { dashedRing } from './strokes'

/**
 * Visuals of the second batch of egg-family signature moves
 * (`game/eggMoves2.ts`). Like `eggMoveFx.ts`, both frame passes of `draw.ts`
 * fall through here: `drawEgg2Ground` under the Pokémon (shadows, rings,
 * trails on the floor) and `drawEgg2Attack` over them. Everything snaps to
 * whole pixels; the per-frame jitter comes from `hash2`, never `Math.random`.
 */

type Ctx = CanvasRenderingContext2D

const px = (ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

const fadeOut = (a: Attack, window: number) => Math.max(0, Math.min(1, (a.ttl - a.age) / window))

/** The angle a hitbox glued to the player points at (its follow offset). */
const followAngle = (a: Attack) => (a.motion.kind === 'follow' ? Math.atan2(a.motion.oy + 8, a.motion.ox) : 0)

/** The way a moving hitbox goes. */
const heading = (a: Attack) => {
  const m = a.motion
  return m.kind === 'linear' || m.kind === 'homing' || m.kind === 'lunge' ? Math.atan2(m.vy, m.vx) : 0
}

/** Square-brush line from (x0, y0) to (x1, y1), `w` px thick. */
const line = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: string) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)))
  const half = Math.floor(w / 2)
  ctx.fillStyle = color
  for (let i = 0; i <= n; i++) {
    const k = i / n
    ctx.fillRect(Math.round(x0 + (x1 - x0) * k) - half, Math.round(y0 + (y1 - y0) * k) - half, w, w)
  }
}

/** A filled pixel disc (`squash` flattens it). */
const disc = (ctx: Ctx, x: number, y: number, r: number, color: string, squash = 1) => {
  const ri = Math.max(1, Math.round(r))
  blitEllipse(ctx, ri, Math.max(1, Math.round(ri * squash)), color, x, y)
}

/**
 * A thick crescent around (x, y) facing `dir`, `span` radians wide, revealed
 * by `sweep` (0..1); `colors` go from the outer rim inward.
 */
const crescent = (ctx: Ctx, x: number, y: number, r: number, dir: number, span: number, sweep: number, colors: readonly string[]) => {
  const steps = Math.max(6, Math.ceil(r * span * 1.3))
  for (let i = 0; i <= steps * sweep; i++) {
    const angle = dir - span / 2 + (span * i) / steps
    const thick = Math.max(1, Math.round(Math.sin((i / steps) * Math.PI) * colors.length))
    for (let k = 0; k < thick; k++) px(ctx, x + Math.cos(angle) * (r - k), y + Math.sin(angle) * (r - k), colors[k]!)
  }
}

/** Short rays of light around (x, y): an impact. */
const rays = (ctx: Ctx, x: number, y: number, size: number, count: number, colors: readonly [string, string], spin = 0, inner = 2) => {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + spin
    const len = i % 2 === 0 ? size : size * 0.6
    for (let d = inner; d <= len; d++) px(ctx, x + Math.cos(angle) * d, y + Math.sin(angle) * d, d < len * 0.5 ? colors[0] : colors[1])
  }
}

/** A jagged spark from (x, y) toward `angle`, `len` px long, seeded by `seed` (it flickers frame to frame). */
const spark = (ctx: Ctx, x: number, y: number, angle: number, len: number, seed: number, colors: readonly [string, string]) => {
  let cx = x
  let cy = y
  const steps = Math.max(2, Math.round(len / 4))
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    const jag = (hash2(seed, i) - 0.5) * 6
    const nx = x + Math.cos(angle) * len * k - Math.sin(angle) * jag
    const ny = y + Math.sin(angle) * len * k + Math.cos(angle) * jag
    line(ctx, cx, cy, nx, ny, 1, i === 1 ? colors[1] : colors[0])
    cx = nx
    cy = ny
  }
}

/** Weather Ball's colors by form (`weatherBallForm`): rim, body, light. */
const BALL_COLORS = [
  ['#685870', '#d8d0e0', '#ffffff'],
  ['#a83808', '#f88830', '#f8e070'],
  ['#183898', '#4880e8', '#a8d8ff'],
  ['#584020', '#a88850', '#e0d0a0'],
  ['#3878a8', '#a8d8f0', '#ffffff'],
] as const

/* ---------------- Ground layer ---------------- */

/** Ground layer (under Pokémon): trails, shadows of things in the air, rings on the floor. */
export const drawEgg2Ground = (ctx: Ctx, a: Attack, t: number) => {
  if (a.shape.kind !== 'circle') return
  const r = a.shape.r
  switch (a.visual) {
    case 'braveBird': {
      // A streak of blue fire scorched along the dive.
      const m = a.motion
      const done = m.kind === 'lunge' ? 1 - m.left / BRAVE.time : 1
      ctx.globalAlpha = fadeOut(a, 0.22) * 0.85
      const fx = a.from.x
      const fy = a.from.y
      const tx = a.x
      const ty = a.y + 8
      line(ctx, fx, fy, tx, ty, 5, 'rgba(56,144,240,0.35)')
      line(ctx, fx + (tx - fx) * (1 - done) * 0.3, fy + (ty - fy) * (1 - done) * 0.3, tx, ty, 2, '#88d0ff')
      ctx.globalAlpha = 1
      return
    }
    case 'weatherBall': {
      if (a.age < a.activeFrom) {
        const k = a.age / a.activeFrom
        disc(ctx, a.x, a.y + 8, 3 + 4 * k, 'rgba(16,16,32,0.35)', 0.5)
        return
      }
      const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
      const c = BALL_COLORS[a.tier] ?? BALL_COLORS[0]
      ctx.globalAlpha = Math.max(0, 1 - e)
      dashedRing(ctx, a.x, a.y + 6, r * (0.8 + e * 0.5), a.id, [c[1], c[2]], 0.8, 0.5)
      ctx.globalAlpha = 1
      return
    }
    case 'zapCannon':
      disc(ctx, a.x, a.y + 12, r * 0.9, 'rgba(248,216,48,0.22)', 0.4)
      return
    case 'wildCharge': {
      ctx.globalAlpha = Math.min(1, a.age / 0.1, fadeOut(a, 0.25))
      disc(ctx, a.x, a.y + 9, r + 2, 'rgba(248,216,48,0.25)', 0.4)
      dashedRing(ctx, a.x, a.y + 9, r + 2, t * 9, ['#fff8a0', '#f8d030'], 0.5, 0.4)
      ctx.globalAlpha = 1
      return
    }
    case 'cottonSpore': {
      ctx.globalAlpha = Math.min(1, Math.max(0, a.age / Math.max(0.01, a.activeFrom)), fadeOut(a, 0.4))
      disc(ctx, a.x, a.y + 8, r, 'rgba(232,224,248,0.22)', 0.5)
      dashedRing(ctx, a.x, a.y + 8, r, t * 1.5, ['#ffffff', '#d8d0f0'], 0.45, 0.5)
      ctx.globalAlpha = 1
      return
    }
    case 'spore': {
      // Two rings of spores rolling out over the floor.
      const k = a.age / a.ttl
      ctx.globalAlpha = Math.max(0, 1 - k) * 0.9
      const e = Math.min(1, k * 2.2)
      disc(ctx, a.x, a.y + 6, r * e, 'rgba(168,200,88,0.18)', 0.5)
      dashedRing(ctx, a.x, a.y + 6, r * e, t * 2, ['#f8f8d0', '#d8f0a0', '#a8c858'], 0.85, 0.5)
      dashedRing(ctx, a.x, a.y + 5, r * e - 1, -t * 2, ['#d8f0a0', '#ffffff'], 0.7, 0.5)
      dashedRing(ctx, a.x, a.y + 6, r * e * 0.65, -t * 3, ['#f8f8d0'], 0.55, 0.5)
      ctx.globalAlpha = 1
      return
    }
    case 'waterfall': {
      // A pool spreading where the pillar rises.
      const k = Math.min(1, a.age / FALL_RISE)
      ctx.globalAlpha = fadeOut(a, 0.25)
      disc(ctx, a.x, a.y, r * (0.5 + 0.6 * k), a.tier ? 'rgba(24,64,168,0.45)' : 'rgba(72,128,232,0.35)', 0.45)
      dashedRing(ctx, a.x, a.y, r * (0.7 + 0.6 * k), a.id, ['#a8d8f8', '#ffffff'], 0.7, 0.45)
      ctx.globalAlpha = 1
      return
    }
    case 'lastResort': {
      if (a.age < a.activeFrom) {
        const k = a.age / a.activeFrom
        disc(ctx, a.x, a.y + 8, (a.tier ? 6 : 3) + (a.tier ? 8 : 3) * k, 'rgba(40,24,0,0.35)', 0.5)
        if (a.tier && Math.floor(a.age * 30) % 2 === 0) dashedRing(ctx, a.x, a.y + 8, r, a.age * 6, ['#f8d030', '#ffffff'], 0.8, 0.45)
        return
      }
      // Cracks of light on the floor.
      const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
      ctx.globalAlpha = Math.max(0, 1 - e)
      const cracks = a.tier ? 10 : 5
      for (let i = 0; i < cracks; i++) {
        const angle = (i / cracks) * TAU + a.id
        const len = Math.min(r * (0.6 + e * 0.6), 46)
        for (let d = 3; d < len; d += 1.5) px(ctx, a.x + Math.cos(angle) * d + Math.sin(d + i) * 1.2, a.y + 8 + Math.sin(angle) * d * 0.5, d < len / 2 ? '#fff8c0' : '#c89020')
      }
      ctx.globalAlpha = 1
      return
    }
  }
}

/* ---------------- Air layer ---------------- */

/** Overlay layer (above Pokémon). */
export const drawEgg2Attack = (ctx: Ctx, a: Attack, t: number) => {
  const r = a.shape.kind === 'circle' ? a.shape.r : 8
  switch (a.visual) {
    case 'braveBird':
      return drawBraveBird(ctx, a, t)
    case 'weatherBall':
      return drawWeatherBall(ctx, a, r)
    case 'accelerock':
      return drawAccelerock(ctx, a)
    case 'zapCannon':
      return drawZap(ctx, a, t, r)
    case 'aerialAce': {
      // A crescent of wind sweeps across the foe, then a four-pointed glint.
      const k = Math.min(1, a.age / 0.09)
      const dir = a.flip ? Math.PI * 0.75 : -Math.PI * 0.25
      ctx.globalAlpha = fadeOut(a, 0.12)
      crescent(ctx, a.x - Math.cos(dir) * r * 0.6, a.y - Math.sin(dir) * r * 0.6, r + 4, dir, 2.2, k, ['#ffffff', '#c8f0ff', '#78c8f8'])
      if (a.age > 0.06) {
        const s = Math.round(2 + (a.age - 0.06) * 30)
        line(ctx, a.x - s, a.y, a.x + s, a.y, 1, '#ffffff')
        line(ctx, a.x, a.y - s, a.x, a.y + s, 1, '#ffffff')
        px(ctx, a.x - 1, a.y - 1, '#c8f0ff', 3, 3)
      }
      ctx.globalAlpha = 1
      return
    }
    case 'crossPoison':
      return drawCross(ctx, a, r)
    case 'bubbleBeam': {
      // A wobbling bubble with a glint; it shivers bigger and smaller as it flies.
      const wob = Math.round(Math.sin(a.age * 18 + a.id) * 0.6)
      const br = Math.max(2, Math.round(r) + wob)
      ctx.globalAlpha = fadeOut(a, 0.15)
      disc(ctx, a.x, a.y, br, 'rgba(120,184,248,0.35)')
      blitRing(ctx, br, 1, '#4890e8', a.x, a.y)
      px(ctx, a.x - Math.ceil(br / 2), a.y - Math.ceil(br / 2), '#ffffff', br > 3 ? 2 : 1, 1)
      ctx.globalAlpha = 1
      return
    }
    case 'rockBlast':
      ctx.globalAlpha = fadeOut(a, 0.1)
      blitRotated(ctx, a.flip ? EGG2_FX.boulderGray() : EGG2_FX.boulder(), a.x, a.y, a.age * (a.flip ? -14 : 14), Math.max(1, Math.round(r / 7)))
      ctx.globalAlpha = 1
      return
    case 'cottonSpore':
      return drawCotton(ctx, a, t, r)
    case 'wildCharge':
      return drawWildCharge(ctx, a, t, r)
    case 'playRough':
      return drawBrawl(ctx, a, r)
    case 'spore': {
      // Spores puffing out and drifting up.
      const k = a.age / a.ttl
      const rr = (a.shape.kind === 'circle' ? a.shape.r : 40) * Math.min(1, k * 2.2)
      ctx.globalAlpha = Math.max(0, 1 - k)
      if (k < 0.35) disc(ctx, a.x, a.y + 2, rr * 0.7, 'rgba(216,240,160,0.35)', 0.7)
      for (let i = 0; i < 44; i++) {
        const angle = hash2(a.id, i) * TAU
        const d = rr * (0.3 + 0.7 * hash2(i, a.id))
        const y = a.y + Math.sin(angle) * d * 0.55 - k * 14 * hash2(i, 7)
        px(ctx, a.x + Math.cos(angle) * d, y, i % 3 === 0 ? '#f8f8d0' : i % 3 === 1 ? '#d8f0a0' : '#a8c858', i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1)
      }
      ctx.globalAlpha = 1
      return
    }
    case 'waterfall':
      return drawWaterfall(ctx, a, t, r)
    case 'lastResort':
      return drawLastResort(ctx, a, r)
  }
}

/** Brave Bird: the player wrapped in a bird of blue fire, wings swept back, leaving feathers of flame. */
const drawBraveBird = (ctx: Ctx, a: Attack, t: number) => {
  const m = a.motion
  const diving = m.kind === 'lunge' && m.left > 0
  const dir = heading(a)
  ctx.globalAlpha = diving ? 0.8 : fadeOut(a, 0.22) * 0.8
  const flick = Math.floor(t * 20) % 2 === 0
  blitRotated(ctx, flick ? EGG2_FX.birdHot() : EGG2_FX.bird(), a.x + Math.cos(dir) * 4, a.y + Math.sin(dir) * 4, dir, 2)
  // Embers of blue flame peeling off the wings.
  for (let i = 0; i < 6; i++) {
    const back = 6 + hash2(a.id, Math.floor(t * 24) + i) * 18
    const side = (hash2(i, Math.floor(t * 24)) - 0.5) * 18
    px(ctx, a.x - Math.cos(dir) * back - Math.sin(dir) * side, a.y - Math.sin(dir) * back + Math.cos(dir) * side, i % 2 ? '#88d0ff' : '#ffffff')
  }
  ctx.globalAlpha = 1
}

/** Weather Ball: arcs from the player onto the target, dressed for the weather, and bursts there. */
const drawWeatherBall = (ctx: Ctx, a: Attack, r: number) => {
  const c = BALL_COLORS[a.tier] ?? BALL_COLORS[0]
  if (a.age < a.activeFrom) {
    const k = a.age / BALL_LOB
    const x = a.from.x + (a.x - a.from.x) * k
    const y = a.from.y + (a.y - a.from.y) * k - Math.sin(k * Math.PI) * 34
    drawBall(ctx, x, y, a.tier, k * 9)
    return
  }
  const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
  ctx.globalAlpha = Math.max(0, 1 - e)
  if (e < 0.25) disc(ctx, a.x, a.y, r * (0.5 + e * 1.5), c[2])
  blitRing(ctx, Math.max(2, Math.round(r * (0.5 + e * 0.6))), 2, c[1], a.x, a.y)
  blitRing(ctx, Math.max(1, Math.round(r * (0.3 + e * 0.5))), 1, c[2], a.x, a.y)
  // Each weather bursts its own way: flames up, splashes, chips of rock, flakes.
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * TAU + a.id
    const d = r * (0.4 + e * 0.8)
    const x = a.x + Math.cos(angle) * d
    const y = a.y + Math.sin(angle) * d * 0.7 - (a.tier === 1 ? e * 12 : a.tier === 2 ? -e * 6 + Math.sin(e * Math.PI) * -8 : 0)
    if (a.tier === 4) {
      px(ctx, x - 1, y, '#ffffff', 3, 1)
      px(ctx, x, y - 1, '#ffffff', 1, 3)
    } else if (a.tier === 3) px(ctx, x, y, i % 2 ? c[0] : c[1], 2, 2)
    else px(ctx, x, y, i % 2 ? c[2] : c[1], 2, a.tier === 2 ? 2 : 1)
  }
  if (e < 0.3) rays(ctx, a.x, a.y, r * 0.6, 8, [c[2], c[1]], a.id)
  ctx.globalAlpha = 1
}

/** The ball itself at (x, y): a shaded sphere in the form's colors with the weather's mark on it, spinning by `spin`. */
const drawBall = (ctx: Ctx, x: number, y: number, form: number, spin: number) => {
  const c = BALL_COLORS[form] ?? BALL_COLORS[0]
  disc(ctx, x, y, 6, c[0])
  disc(ctx, x, y, 5, c[1])
  disc(ctx, x - 1, y - 1, 3, c[2])
  px(ctx, x - 3, y - 4, '#ffffff', 2, 1)
  const a = spin
  switch (form) {
    case 1:
      // A little sun: rays around the ball.
      for (let i = 0; i < 6; i++) px(ctx, x + Math.cos(a + (i * TAU) / 6) * 7, y + Math.sin(a + (i * TAU) / 6) * 7, '#f8e070')
      return
    case 2:
      px(ctx, x + 2, y + 1, '#ffffff')
      px(ctx, x + Math.cos(a) * 7, y + 3 + ((a * 3) % 4), '#a8d8ff')
      return
    case 3:
      px(ctx, x + Math.cos(a) * 2, y + 1, c[0], 2, 1)
      px(ctx, x - 2, y + 2, c[0])
      return
    case 4:
      px(ctx, x - 2, y, '#ffffff', 5, 1)
      px(ctx, x, y - 2, '#ffffff', 1, 5)
      return
    default:
      px(ctx, x - 4, y, c[0], 9, 1)
  }
}

/** Accelerock: a blur of rock from the player to the foe, with chips flying off and a burst at the end. */
const drawAccelerock = (ctx: Ctx, a: Attack) => {
  const e = a.age / a.ttl
  ctx.globalAlpha = Math.max(0, 1 - e * 1.2)
  const fx = a.from.x
  const fy = a.from.y
  // The blur pulls in from the start toward the foe as it fades.
  const sx = fx + (a.x - fx) * Math.min(0.9, e * 1.6)
  const sy = fy + (a.y - fy) * Math.min(0.9, e * 1.6)
  line(ctx, sx, sy, a.x, a.y, 5, 'rgba(160,136,96,0.5)')
  line(ctx, sx, sy, a.x, a.y, 3, '#c8b488')
  line(ctx, sx, sy, a.x, a.y, 1, '#fff8e0')
  const dir = Math.atan2(a.y - fy, a.x - fx)
  for (let i = 0; i < 3; i++) {
    const k = 0.25 + i * 0.25
    const off = (hash2(a.id, i) - 0.5) * 10
    px(ctx, fx + (a.x - fx) * k - Math.sin(dir) * off * (1 + e * 3), fy + (a.y - fy) * k + Math.cos(dir) * off * (1 + e * 3), i % 2 ? '#806848' : '#d0bc90', 2, 2)
  }
  blitRotated(ctx, a.flip ? EGG2_FX.rockGray() : EGG2_FX.rock(), a.x - Math.cos(dir) * 4, a.y - Math.sin(dir) * 4, dir + e * 3)
  if (e < 0.5) rays(ctx, a.x, a.y, 9, 8, ['#ffffff', '#d0bc90'], a.id, 4)
  ctx.globalAlpha = 1
}

/** Zap Cannon: a fat crackling orb with arcs leaping off it. */
const drawZap = (ctx: Ctx, a: Attack, t: number, r: number) => {
  const pulse = Math.floor(t * 16) % 2
  ctx.globalAlpha = Math.min(1, a.age / 0.1, fadeOut(a, 0.2))
  disc(ctx, a.x, a.y, r + 2 + pulse, 'rgba(248,216,48,0.3)')
  disc(ctx, a.x, a.y, r, '#f8d030')
  disc(ctx, a.x, a.y, r * 0.72, '#fff8a0')
  disc(ctx, a.x - r * 0.15, a.y - r * 0.15, r * 0.4, '#ffffff')
  blitRing(ctx, Math.round(r), 1, '#a86808', a.x, a.y)
  const frame = Math.floor(t * 18)
  for (let i = 0; i < 5; i++) {
    const angle = hash2(a.id + frame, i) * TAU
    spark(ctx, a.x + Math.cos(angle) * r * 0.8, a.y + Math.sin(angle) * r * 0.8, angle, 6 + hash2(i, frame) * 8, frame * 7 + i, ['#f8d030', '#ffffff'])
  }
  dashedRing(ctx, a.x, a.y, r + 4, t * 8, ['#fff8a0', '#ffffff'], 0.4)
  ctx.globalAlpha = 1
}

/** Cross Poison: two venom blades slash across each other in an X; a critical one is bigger and edged in white-gold. */
const drawCross = (ctx: Ctx, a: Attack, r: number) => {
  const dir = followAngle(a)
  const k = Math.min(1, a.age / 0.09)
  const crit = a.tier === 1
  ctx.globalAlpha = fadeOut(a, 0.12)
  const half = r + (crit ? 5 : 2)
  const colors = crit ? (['#fff0a0', '#ffffff', '#d080ff'] as const) : (['#7830b0', '#c068f0', '#f0c8ff'] as const)
  // Each blade sweeps in from one corner of the X; the second follows a blink later.
  for (const [n, tilt] of [[0, 0.78], [1, -0.78]] as const) {
    const reveal = Math.max(0, Math.min(1, k * 1.6 - n * 0.6))
    if (reveal <= 0) continue
    // The X stays an X on screen whichever way the foe is; it leans a little toward it.
    const angle = tilt * 1.0 + Math.PI / 2 + Math.sign(Math.cos(dir)) * 0.15
    const x0 = a.x - Math.cos(angle) * half
    const y0 = a.y - Math.sin(angle) * half
    const x1 = x0 + Math.cos(angle) * half * 2 * reveal
    const y1 = y0 + Math.sin(angle) * half * 2 * reveal
    line(ctx, x0, y0, x1, y1, crit ? 5 : 4, colors[0])
    line(ctx, x0, y0, x1, y1, crit ? 3 : 2, colors[1])
    line(ctx, x0 + Math.cos(angle) * 2, y0 + Math.sin(angle) * 2, x1, y1, 1, colors[2])
  }
  if (k >= 1 && a.age < 0.16) blitRing(ctx, Math.round(4 + a.age * 40), 1, crit ? '#fff0a0' : '#f0c8ff', a.x, a.y)
  if (crit && a.age > 0.05) rays(ctx, a.x, a.y, r + 8, 10, ['#ffffff', '#f8e070'], a.age * 4, 6)
  // Drops of venom flung off the blades.
  for (let i = 0; i < 5; i++) {
    const angle = dir + (hash2(a.id, i) - 0.5) * 3
    const d = r * 0.4 + a.age * 70
    px(ctx, a.x + Math.cos(angle) * d, a.y + Math.sin(angle) * d + a.age * a.age * 200, i % 2 ? '#a048d8' : '#e0a0ff', 2, 2)
  }
  ctx.globalAlpha = 1
}

/** Cotton Spore: the cloud floats in from the player, then sits puffing, shedding tufts of cotton. */
const drawCotton = (ctx: Ctx, a: Attack, t: number, r: number) => {
  const k = Math.min(1, a.age / Math.max(0.01, a.activeFrom))
  const x = a.from.x + (a.x - a.from.x) * k
  const y = a.from.y + (a.y - a.from.y) * k - Math.sin(k * Math.PI) * 18
  const size = r * (0.45 + 0.55 * k)
  ctx.globalAlpha = Math.min(0.58, fadeOut(a, 0.4))
  // A ring of puffs bobbing around a lighter heart, so the foes inside still show.
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * TAU + a.id
    const bob = Math.sin(t * 3 + i) * 1.5
    const pr = size * (0.27 + 0.06 * Math.sin(i * 2.3))
    disc(ctx, x + Math.cos(angle) * size * 0.68, y + Math.sin(angle) * size * 0.4 + bob - 4, pr, i % 2 ? '#f0ecf8' : '#ffffff', 0.8)
  }
  disc(ctx, x, y - 4, size * 0.4, 'rgba(255,255,255,0.35)', 0.7)
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * TAU + a.id
    px(ctx, x + Math.cos(angle) * size * 0.68 - size * 0.12, y + Math.sin(angle) * size * 0.4 - 4 - size * 0.2, '#ffffff', 2, 1)
  }
  // Tufts drifting down out of the cloud.
  for (let i = 0; i < 6; i++) {
    const phase = (t * 0.6 + hash2(a.id, i)) % 1
    const fx = x + (hash2(i, a.id) - 0.5) * size * 1.6 + Math.sin(t * 2 + i) * 3
    const fy = y - 2 + phase * size * 0.8
    ctx.globalAlpha = Math.min(0.9, fadeOut(a, 0.4)) * (1 - phase)
    px(ctx, fx, fy, '#ffffff', 2, 2)
    px(ctx, fx + 1, fy + 2, '#a8a0c0')
  }
  ctx.globalAlpha = 1
}

/** Wild Charge: crackling electricity all over the player's body. */
const drawWildCharge = (ctx: Ctx, a: Attack, t: number, r: number) => {
  ctx.globalAlpha = Math.min(1, a.age / 0.08, fadeOut(a, 0.25))
  const frame = Math.floor(t * 20)
  dashedRing(ctx, a.x, a.y, r, t * 12, ['#fff8a0', '#f8d030', '#ffffff'], 0.55, 0.9)
  for (let i = 0; i < 4; i++) {
    const angle = hash2(frame, i) * TAU
    spark(ctx, a.x + Math.cos(angle) * r * 0.4, a.y + Math.sin(angle) * r * 0.5, angle, r * 0.9 + 3, frame * 5 + i, ['#f8d030', '#ffffff'])
  }
  if (frame % 3 === 0) blitRing(ctx, Math.round(r + 3), 1, '#fff8a0', a.x, a.y)
  ctx.globalAlpha = 1
}

/** Play Rough: a cartoon brawl cloud shaking on the foe, with stars, a fist and a heart popping out. */
const drawBrawl = (ctx: Ctx, a: Attack, r: number) => {
  const beat = Math.floor(a.age * 14)
  ctx.globalAlpha = Math.min(1, a.age / 0.06, fadeOut(a, 0.15))
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * TAU + beat * 0.6
    const jx = (hash2(beat, i) - 0.5) * 3
    const jy = (hash2(i, beat) - 0.5) * 3
    disc(ctx, a.x + Math.cos(angle) * r * 0.55 + jx, a.y + Math.sin(angle) * r * 0.45 + jy, r * 0.42, i % 2 ? '#f8e0f0' : '#ffffff', 0.85)
  }
  disc(ctx, a.x, a.y, r * 0.5, '#f0c8e0', 0.85)
  // What pops out of the cloud changes on every beat.
  const pop = beat % 3
  const angle = hash2(a.id, beat) * TAU
  const ox = a.x + Math.cos(angle) * r * 0.9
  const oy = a.y + Math.sin(angle) * r * 0.7
  if (pop === 0) blitRotated(ctx, EGG2_FX.fist(), ox, oy, angle)
  else if (pop === 1) blitCentered(ctx, EGG2_FX.heart(), ox, oy)
  else rays(ctx, ox, oy, 5, 6, ['#ffffff', '#f8d030'], beat)
  for (let i = 0; i < 2; i++) {
    const sa = hash2(beat + i, a.id) * TAU
    blitCentered(ctx, EGG2_FX.starSmall(), a.x + Math.cos(sa) * r * 0.7, a.y + Math.sin(sa) * r * 0.6)
  }
  ctx.globalAlpha = 1
}

/** Waterfall: a pillar of water shooting up, its stripes running down, foam at the top and a splash at the foot. */
const drawWaterfall = (ctx: Ctx, a: Attack, t: number, r: number) => {
  const big = a.tier === 1
  const rise = Math.min(1, a.age / FALL_RISE)
  const fall = a.age > FALL_RISE + 0.18 ? Math.min(1, (a.age - FALL_RISE - 0.18) / 0.24) : 0
  const height = Math.round((big ? 46 : 34) * rise * (1 - fall * 0.85))
  const w = Math.max(5, Math.round(r * (big ? 1.25 : 1)))
  const left = Math.round(a.x - w / 2)
  const bottom = Math.round(a.y)
  ctx.globalAlpha = Math.max(0, 1 - fall * 0.6)
  ctx.fillStyle = big ? '#183898' : '#2858c8'
  ctx.fillRect(left, bottom - height, w, height)
  ctx.fillStyle = big ? '#3870e0' : '#4890f0'
  ctx.fillRect(left + 1, bottom - height, w - 2, height)
  ctx.fillStyle = '#a8d8f8'
  ctx.fillRect(left + Math.floor(w / 2) - 1, bottom - height, 2, height)
  // Streaks running down the column.
  for (let i = 0; i < 4; i++) {
    const sy = (t * 90 + i * 11 + a.id * 5) % Math.max(1, height)
    px(ctx, left + 1 + ((i * 3) % Math.max(1, w - 2)), bottom - height + sy, '#ffffff', 1, 3)
  }
  // Foam crowning the top.
  for (let i = 0; i < 5; i++) {
    const fx = left - 1 + (i * (w + 2)) / 4
    const fy = bottom - height - 1 - Math.round(Math.abs(Math.sin(t * 12 + i)) * 2)
    px(ctx, fx, fy, '#ffffff', 2, 2)
  }
  // Spray at the foot.
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI + (i / 5) * Math.PI
    const d = 3 + rise * (w * 0.8 + (i % 2) * 3)
    px(ctx, a.x + Math.cos(angle) * d, bottom + Math.sin(angle) * d * 0.4 - 1, i % 2 ? '#ffffff' : '#a8d8f8', 2, 1)
  }
  ctx.globalAlpha = 1
}

/** Last Resort: a star falls onto the foe and lands in a burst; at full power it's huge and the whole screen rings. */
const drawLastResort = (ctx: Ctx, a: Attack, r: number) => {
  const full = a.tier === 1
  if (a.age < a.activeFrom) {
    const k = a.age / RESORT_WINDUP
    const drop = Math.round((full ? 90 : 50) * (1 - k * k))
    blitRotated(ctx, EGG2_FX.star(), a.x, a.y - drop, k * 4, full ? 2 : 1)
    return
  }
  const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
  ctx.globalAlpha = Math.max(0, 1 - e)
  if (full) {
    blitRing(ctx, Math.max(2, Math.round(r * (0.4 + e * 0.9))), 3, '#f8d030', a.x, a.y)
    blitRing(ctx, Math.max(1, Math.round(r * (0.3 + e * 0.7))), 1, '#ffffff', a.x, a.y)
    rays(ctx, a.x, a.y, r * (0.7 + e * 0.5), 12, ['#ffffff', '#f8d030'], e, 4)
  } else {
    blitRing(ctx, Math.max(2, Math.round(r * (0.5 + e * 0.5))), 1, '#f8e070', a.x, a.y)
  }
  // Little stars scattering from the impact.
  const count = full ? 8 : 3
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + a.id
    const d = r * (0.3 + e * (full ? 1.2 : 0.6))
    blitCentered(ctx, EGG2_FX.starSmall(), a.x + Math.cos(angle) * d, a.y + Math.sin(angle) * d * 0.7 - e * 8)
  }
  if (e < 0.4) blitRotated(ctx, EGG2_FX.star(), a.x, a.y, 0, full ? 2 : 1)
  ctx.globalAlpha = 1
}
