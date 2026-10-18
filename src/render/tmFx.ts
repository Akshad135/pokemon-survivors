import { blitCentered, blitRotated, ellipse } from '../engine/pixelart'
import { TAU } from '../engine/math'
import { hash2 } from '../engine/rng'
import { TYPE_COLORS } from '../data/types'
import { walkedSince } from '../game/kitRules'
import { MOVES } from '../game/moves'
import { AURORA, dischargeCharge, ICE_BEAM, ROCK_SLIDE } from '../game/tmMoves'
import type { Attack, Game, Pickup } from '../game/types'
import { tmDisc, TM_FX } from './tmArt'
import { dashedRing } from './strokes'

/**
 * Art of the TM moves (`game/tmMoves.ts`) and the TM discs on the ground.
 * `draw.ts` calls the passes once a frame like the verb moves': `drawTmGround`
 * under the Pokémon (shadows, lava pools, dust), `drawTmAir` over them
 * (rocks, beams, bubbles, fangs, orbs) and `drawTmPlayer` for what a move
 * leaves on the player (Discharge's charge, Ancient Power's boost, the iron body).
 * Everything snaps to whole pixels; flicker comes from `hash2`, never from Math.random.
 */

type Ctx = CanvasRenderingContext2D

const px = (ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

const fadeOut = (a: Attack, window: number) => Math.max(0, Math.min(1, (a.ttl - a.age) / window))
const radiusOf = (a: Attack) => (a.shape.kind === 'circle' ? a.shape.r : 8)

/** Square-brush line from (x0, y0) to (x1, y1), `w` px thick. */
const thickLine = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: string) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)))
  const half = Math.floor(w / 2)
  ctx.fillStyle = color
  for (let i = 0; i <= n; i++) {
    const k = i / n
    ctx.fillRect(Math.round(x0 + (x1 - x0) * k) - half, Math.round(y0 + (y1 - y0) * k) - half, w, w)
  }
}

/** A jagged bolt from (x0, y0) to (x1, y1): `kinks` zigzags, seeded by `seed` so it holds for a frame or two. */
const zigzag = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, kinks: number, seed: number, colors: readonly [string, string]) => {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  let ax = x0
  let ay = y0
  for (let i = 1; i <= kinks; i++) {
    const k = i / kinks
    const off = i === kinks ? 0 : (hash2(seed, i) - 0.5) * 7
    const bx = x0 + dx * k + nx * off
    const by = y0 + dy * k + ny * off
    thickLine(ctx, ax, ay, bx, by, 2, colors[0])
    thickLine(ctx, ax, ay, bx, by, 1, colors[1])
    ax = bx
    ay = by
  }
}

/** Eight thin rays around (x, y), `len` px long: a sparkle. */
const spokes = (ctx: Ctx, x: number, y: number, len: number, colors: readonly string[], rot: number) => {
  for (let i = 0; i < 8; i++) {
    const a = rot + (i / 8) * TAU
    const l = i % 2 === 0 ? len : len * 0.55
    for (let d = 1; d <= l; d++) px(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, colors[Math.min(colors.length - 1, Math.floor((d / (l + 1)) * colors.length))]!)
  }
}

const RAINBOW = ['#f85888', '#f8a030', '#f8e030', '#78d850', '#58c8f8', '#a070f8'] as const
const LAVA = ['#401008', '#a82010', '#f06018', '#f8b030', '#fff0a0'] as const

/* ---------------- Ground ---------------- */

const drawRockShadow = (ctx: Ctx, a: Attack) => {
  const r = radiusOf(a)
  if (a.age < a.activeFrom) {
    const k = a.age / a.activeFrom
    blitCentered(ctx, ellipse(Math.max(1, Math.round(r * (0.35 + 0.5 * k))), Math.max(1, Math.round(r * 0.4 * (0.35 + 0.5 * k))), 'rgba(24,16,8,0.38)'), a.x, a.y + 3)
    return
  }
  const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
  ctx.globalAlpha = Math.max(0, 1 - e)
  blitCentered(ctx, ellipse(Math.round(r * 0.8), Math.max(1, Math.round(r * 0.32)), 'rgba(24,16,8,0.3)'), a.x, a.y + 3)
  dashedRing(ctx, a.x, a.y + 3, r * (0.8 + e * 0.8), a.id, ['#7a6040', '#b89868', '#e0d0a8'], 0.6, 0.45)
  ctx.globalAlpha = 1
}

const drawLavaPool = (ctx: Ctx, a: Attack, t: number) => {
  if (a.age < a.activeFrom) return
  const r = radiusOf(a)
  const open = Math.min(1, (a.age - a.activeFrom) / 0.15)
  const cool = 1 - fadeOut(a, 0.8)
  const rx = Math.max(2, Math.round(r * open))
  const ry = Math.max(1, Math.round(r * 0.5 * open))
  ctx.globalAlpha = fadeOut(a, 0.35)
  blitCentered(ctx, ellipse(rx + 1, ry + 1, '#301008'), a.x, a.y)
  blitCentered(ctx, ellipse(rx, ry, cool > 0.5 ? '#702010' : '#c83010'), a.x, a.y)
  if (rx > 3) blitCentered(ctx, ellipse(rx - 2, Math.max(1, ry - 1), cool > 0.5 ? '#a83818' : '#f06818'), a.x, a.y)
  if (rx > 5 && cool < 0.6) blitCentered(ctx, ellipse(Math.round(rx * 0.45), Math.max(1, Math.round(ry * 0.4)), '#f8b030'), a.x - 1, a.y - 1)
  // Bubbles pop here and there.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 1.6 + hash2(a.id, i)) % 1
    if (ph > 0.55) continue
    const bx = a.x + (hash2(a.id, i, 1) - 0.5) * rx * 1.4
    const by = a.y + (hash2(a.id, i, 2) - 0.5) * ry * 1.2
    px(ctx, bx, by - ph * 3, ph < 0.4 ? '#fff0a0' : '#f8b030', ph < 0.25 ? 2 : 1, 1)
  }
  ctx.globalAlpha = 1
}

const drawDischargeGround = (ctx: Ctx, a: Attack) => {
  const r = radiusOf(a)
  ctx.globalAlpha = fadeOut(a, 0.2) * 0.8
  blitCentered(ctx, ellipse(Math.round(r), Math.max(1, Math.round(r * 0.4)), 'rgba(248,216,48,0.18)'), a.x, a.y + 6)
  dashedRing(ctx, a.x, a.y + 6, r, a.age * 9, ['#f8d030', '#fff8a0'], 0.7, 0.4)
  ctx.globalAlpha = 1
}

const drawYawnGround = (ctx: Ctx, a: Attack) => {
  const r = radiusOf(a)
  if (a.age < a.activeFrom) {
    const k = a.age / a.activeFrom
    blitCentered(ctx, ellipse(Math.max(1, Math.round(3 + k * r * 0.4)), Math.max(1, Math.round(1 + k * 2)), 'rgba(40,32,80,0.28)'), a.x, a.y + 6)
    return
  }
  const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
  ctx.globalAlpha = Math.max(0, 1 - e)
  dashedRing(ctx, a.x, a.y + 4, r * (0.6 + 0.5 * e), a.id, ['#d8d0ff', '#b0a8f0'], 0.7, 0.45)
  ctx.globalAlpha = 1
}

export const drawTmGround = (ctx: Ctx, g: Game, t: number) => {
  for (const a of g.attacks) {
    if (a.age < 0) continue
    switch (a.visual) {
      case 'rockSlide':
        drawRockShadow(ctx, a)
        break
      case 'lavaPool':
        drawLavaPool(ctx, a, t)
        break
      case 'lavaPlume': {
        ctx.globalAlpha = fadeOut(a, 0.3) * 0.7
        blitCentered(ctx, ellipse(Math.round(radiusOf(a) * 0.8), Math.max(1, Math.round(radiusOf(a) * 0.35)), 'rgba(48,12,4,0.45)'), a.x, a.y + 1)
        ctx.globalAlpha = 1
        break
      }
      case 'discharge':
        drawDischargeGround(ctx, a)
        break
      case 'yawn':
        drawYawnGround(ctx, a)
        break
      case 'ancientRise': {
        const k = Math.min(1, a.age / a.ttl)
        ctx.globalAlpha = 1 - k
        dashedRing(ctx, a.x, a.y + 4, 3 + k * 7, a.id, ['#f8d870', '#c89848'], 0.8, 0.45)
        ctx.globalAlpha = 1
        break
      }
    }
  }
}

/* ---------------- Air ---------------- */

const drawRock = (ctx: Ctx, a: Attack) => {
  const rocks = TM_FX.rocks()
  const rock = rocks[Math.min(rocks.length - 1, a.memo)]!
  const scale = radiusOf(a) / ROCK_SLIDE.r > 1.3 ? 2 : 1
  if (a.age < a.activeFrom) {
    const k = a.age / a.activeFrom
    const drop = Math.round(78 * (1 - k * k))
    blitRotated(ctx, rock, a.x + Math.round((1 - k) * 6), a.y - 6 - drop, a.age * 9 + a.id, scale)
    return
  }
  // Lands with a little hop, then crumbles.
  const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
  const hop = Math.round(Math.sin(Math.min(1, e * 2.5) * Math.PI) * 4)
  ctx.globalAlpha = Math.min(1, (1 - e) * 3)
  blitRotated(ctx, rock, a.x, a.y - 6 - hop, a.id, scale)
  ctx.globalAlpha = 1
  if (e < 0.5) {
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI + (i / 5) * Math.PI
      const d = 4 + e * 22
      px(ctx, a.x + Math.cos(ang) * d, a.y - 2 + Math.sin(ang) * d * 0.5 + e * e * 30, i % 2 ? '#a08868' : '#dccca4', 2, 2)
    }
  }
}

const drawYawnBubble = (ctx: Ctx, a: Attack, t: number) => {
  const r = radiusOf(a)
  if (a.age < a.activeFrom) {
    // Floats from the mouth to its spot, slowing down, swelling and wobbling.
    const k = a.age / a.activeFrom
    const ease = 1 - (1 - k) * (1 - k)
    const x = a.from.x + (a.x - a.from.x) * ease + Math.sin(k * 9 + a.id) * 3
    const y = a.from.y + (a.y - 12 - a.from.y) * ease - Math.sin(k * Math.PI) * 8
    const br = Math.max(3, Math.round(3 + (r * 0.55 - 3) * ease))
    const wob = Math.round(Math.sin(t * 12 + a.id) * 0.8)
    blitCentered(ctx, ellipse(br + wob, br - wob, 'rgba(208,200,255,0.35)'), x, y)
    for (let i = 0; i < br * 6; i++) {
      const ang = (i / (br * 6)) * TAU
      px(ctx, x + Math.cos(ang) * (br + wob), y + Math.sin(ang) * (br - wob), i % 7 === 0 ? '#ffffff' : '#b8b0f0')
    }
    px(ctx, x - br * 0.45, y - br * 0.5, '#ffffff', 2, 1)
    px(ctx, x - br * 0.6, y - br * 0.3, '#ffffff')
    // Z's drifting up off it.
    const zed = TM_FX.zed()
    for (let i = 0; i < 2; i++) {
      const ph = (k * 1.4 + i * 0.5) % 1
      ctx.globalAlpha = 1 - ph
      blitCentered(ctx, zed, x + br + 2 + ph * 6, y - br - ph * 12)
    }
    ctx.globalAlpha = 1
    return
  }
  // Pop: a ring of droplets and three Z's flying up.
  const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
  ctx.globalAlpha = Math.max(0, 1 - e)
  const rr = r * (0.5 + 0.6 * e)
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * TAU + a.id
    px(ctx, a.x + Math.cos(ang) * rr, a.y - 12 + Math.sin(ang) * rr * 0.7, i % 2 ? '#ffffff' : '#d8d0ff', 2, 2)
  }
  const zed = TM_FX.zed()
  for (let i = 0; i < 3; i++) blitCentered(ctx, zed, a.x - 10 + i * 10, a.y - 16 - e * (18 + i * 6))
  ctx.globalAlpha = 1
}

/** Beams made of orbit slices (Ice Beam, Aurora Beam), layer by layer over every slice so they join into one. */
const drawBeams = (ctx: Ctx, g: Game, t: number) => {
  const p = g.player
  for (let layer = 0; layer < 3; layer++) {
    for (const a of g.attacks) {
      const m = a.motion
      if ((a.visual !== 'iceBeam' && a.visual !== 'auroraBeam') || a.age < 0 || m.kind !== 'orbit') continue
      const ice = a.visual === 'iceBeam'
      const r = radiusOf(a)
      const k = a.age / a.ttl
      const w = r * Math.min(1, a.age / 0.05) * Math.min(1, (1 - k) / 0.3 + 0.15)
      const length = (ice ? ICE_BEAM.length : AURORA.length) * (r / (ice ? ICE_BEAM.r : AURORA.r))
      const segments = ice ? ICE_BEAM.segments : AURORA.segments
      const half = Math.max(5, (length - 12) / (segments - 1) / 2 + 1)
      const cx = Math.cos(m.angle)
      const cy = Math.sin(m.angle)
      const band = Math.floor(m.radius / 9 + t * 14) % RAINBOW.length
      const color =
        layer === 0 ? (ice ? 'rgba(88,168,232,0.55)' : RAINBOW[band]!)
        : layer === 1 ? (ice ? '#c8ecff' : RAINBOW[(band + 2) % RAINBOW.length]!)
        : '#ffffff'
      const thick = layer === 0 ? w * 1.5 + (Math.floor(t * 30 + m.radius) % 2) : layer === 1 ? w * 0.9 : w * 0.35
      thickLine(ctx, p.x + cx * (m.radius - half), p.y - 8 + cy * (m.radius - half), p.x + cx * (m.radius + half), p.y - 8 + cy * (m.radius + half), Math.max(1, Math.round(thick)), color)
      if (layer === 2 && a.flip) spokes(ctx, a.x, a.y, Math.round(w * 1.3) + 4, ice ? ['#ffffff', '#c8ecff', '#78c8f0'] : ['#ffffff', RAINBOW[band]!, RAINBOW[(band + 3) % RAINBOW.length]!], t * 5)
      // Frost glitters along the ice beam.
      if (layer === 2 && ice && hash2(a.id, Math.floor(t * 20)) > 0.6) px(ctx, a.x + (hash2(a.id, 1, Math.floor(t * 20)) - 0.5) * 8, a.y + (hash2(a.id, 2, Math.floor(t * 20)) - 0.5) * 8, '#ffffff')
    }
  }
}

const drawDischarge = (ctx: Ctx, a: Attack, t: number) => {
  const r = radiusOf(a)
  const fade = fadeOut(a, 0.18)
  ctx.globalAlpha = fade
  const bolts = 5 + Math.round(a.memo * 5)
  const seed = a.id * 7 + Math.floor(t * 24)
  for (let i = 0; i < bolts; i++) {
    const ang = (i / bolts) * TAU + hash2(a.id, i) * 0.6
    zigzag(ctx, a.x, a.y, a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r * 0.8, 3, seed + i, ['#f8d030', '#ffffff'])
  }
  dashedRing(ctx, a.x, a.y, r, t * 6, ['#ffffff', '#fff8a0', '#f8d030'], 0.8, 0.8)
  blitCentered(ctx, ellipse(4 + Math.round(a.memo * 3), 4 + Math.round(a.memo * 3), '#fff8c0'), a.x, a.y)
  ctx.globalAlpha = 1
}

const drawHeatWave = (ctx: Ctx, a: Attack, t: number) => {
  const m = a.motion
  if (m.kind !== 'linear') return
  const r = radiusOf(a)
  const dir = Math.atan2(m.vy, m.vx)
  const nx = -Math.sin(dir)
  const ny = Math.cos(dir)
  const fx = Math.cos(dir)
  const fy = Math.sin(dir)
  ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.35)
  const span = Math.round(r * 1.25)
  // Each slice is a curved band: hotter at the front edge, shimmering behind.
  for (let s = -span; s <= span; s++) {
    const bow = -((s / span) ** 2) * 2
    const wav = Math.sin(t * 18 + s * 0.6 + a.id) * 1
    const x = a.x + nx * s + fx * (bow + wav)
    const y = a.y + ny * s + fy * (bow + wav)
    px(ctx, x - fx * 3, y - fy * 3, '#c02010')
    px(ctx, x - fx * 2, y - fy * 2, '#f06018')
    px(ctx, x - fx, y - fy, '#f8b030')
    px(ctx, x, y, Math.abs(s) < span * 0.6 ? '#fff4c0' : '#f8d030')
    if ((s + Math.floor(t * 20)) % 4 === 0) px(ctx, x - fx * (6 + (s & 3)), y - fy * (6 + (s & 3)), 'rgba(248,176,48,0.6)')
  }
  ctx.globalAlpha = 1
}

const drawFang = (ctx: Ctx, a: Attack, t: number) => {
  const top = TM_FX.jawTop()
  const bottom = TM_FX.jawBottom()
  const k = Math.min(1, a.age / a.activeFrom)
  const gap = Math.round(11 * (1 - k * k))
  ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.15)
  blitCentered(ctx, top, a.x, a.y - 4 - gap)
  blitCentered(ctx, bottom, a.x, a.y + 3 + gap)
  if (a.age >= a.activeFrom) {
    const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
    if (e < 0.6) {
      spokes(ctx, a.x, a.y, 8 + Math.round(e * 8), ['#ffffff', '#fff8a0', '#f8d030'], a.id)
      const seed = a.id * 3 + Math.floor(t * 30)
      for (let i = 0; i < 3; i++) {
        const ang = hash2(a.id, i) * TAU
        zigzag(ctx, a.x, a.y, a.x + Math.cos(ang) * 16, a.y + Math.sin(ang) * 16, 3, seed + i, ['#f8d030', '#ffffff'])
      }
    }
  }
  ctx.globalAlpha = 1
}

const drawGeyser = (ctx: Ctx, a: Attack) => {
  const r = radiusOf(a)
  const k = a.age / a.ttl
  const height = Math.round(r * 2.4 * Math.sin(Math.min(1, k * 1.6) * Math.PI))
  if (height > 0) {
    const w = Math.max(3, Math.round(r * 0.55))
    px(ctx, a.x - w, a.y - height, LAVA[1], w * 2 + 1, height)
    px(ctx, a.x - w + 1, a.y - height, LAVA[2], w * 2 - 1, height)
    px(ctx, a.x - 1, a.y - height, LAVA[3], 3, height)
    px(ctx, a.x, a.y - height + 1, LAVA[4], 1, Math.max(1, height - 2))
    blitCentered(ctx, ellipse(w + 1, 2, LAVA[3]), a.x, a.y - height)
  }
  // Molten drops thrown out of it.
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (hash2(a.id, i) - 0.5) * 2.2
    const v = 50 + hash2(a.id, i, 1) * 50
    const tt = a.age
    const x = a.x + Math.cos(ang) * v * tt
    const y = a.y - r * 1.2 + Math.sin(ang) * v * tt + 160 * tt * tt
    if (y > a.y + 4) continue
    px(ctx, x, y, i % 2 ? LAVA[3] : LAVA[4], 2, 2)
  }
}

const drawAncientRise = (ctx: Ctx, a: Attack) => {
  const k = Math.min(1, a.age / a.ttl)
  const rock = TM_FX.ancientRock()
  blitCentered(ctx, ellipse(5, 5, 'rgba(248,216,112,0.35)'), a.x, a.y - 4 - k * 6)
  ctx.globalAlpha = Math.min(1, k * 3)
  blitCentered(ctx, rock, a.x, a.y - k * 10)
  ctx.globalAlpha = 1
  for (let i = 0; i < 3; i++) px(ctx, a.x - 4 + i * 4, a.y + 2 - k * 4, '#a08868')
}

const drawAncientRock = (ctx: Ctx, a: Attack, t: number) => {
  const m = a.motion
  const scale = radiusOf(a) > 7 ? 2 : 1
  if (m.kind === 'homing') {
    const len = Math.hypot(m.vx, m.vy) || 1
    for (let i = 1; i <= 3; i++) px(ctx, a.x - (m.vx / len) * i * 4, a.y - (m.vy / len) * i * 4, i === 1 ? '#f8f0c0' : '#f8d870', 2 - Math.floor(i / 3), 2 - Math.floor(i / 3))
  }
  const glow = 5 + (Math.floor(t * 10 + a.id) % 2)
  blitCentered(ctx, ellipse(glow, glow, 'rgba(248,216,112,0.4)'), a.x, a.y)
  blitRotated(ctx, TM_FX.ancientRock(), a.x, a.y, a.age * 7, scale)
}

const drawIcyWind = (ctx: Ctx, a: Attack, t: number) => {
  const r = radiusOf(a)
  const k = a.age / a.ttl
  ctx.globalAlpha = Math.max(0, 1 - k * k)
  const spin = a.age * 9 + a.memo
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 8; i++) {
      const ang = spin + s * (TAU / 3) + i * 0.22
      const d = r * (0.35 + i * 0.08)
      px(ctx, a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d * 0.7, i > 5 ? '#ffffff' : '#c8ecff')
    }
  }
  for (let i = 0; i < 3; i++) {
    const ph = (t * 2 + hash2(a.id, i)) % 1
    const fx = a.x + (hash2(a.id, i, 1) - 0.5) * r * 2
    const fy = a.y + (hash2(a.id, i, 2) - 0.5) * r * 1.4 + ph * 4
    px(ctx, fx, fy, '#ffffff')
    px(ctx, fx - 1, fy, '#98d8f8')
    px(ctx, fx + 1, fy, '#98d8f8')
    px(ctx, fx, fy - 1, '#98d8f8')
    px(ctx, fx, fy + 1, '#98d8f8')
  }
  ctx.globalAlpha = 1
}

const drawIronShard = (ctx: Ctx, a: Attack) => {
  const m = a.motion
  if (m.kind !== 'linear') return
  ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.2)
  blitRotated(ctx, TM_FX.shard(), a.x, a.y, Math.atan2(m.vy, m.vx), radiusOf(a) > 5 ? 2 : 1)
  ctx.globalAlpha = 1
}

const drawPsyHover = (ctx: Ctx, a: Attack, t: number) => {
  const k = Math.min(1, a.age / a.ttl)
  const r = Math.round(1 + k * 3)
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * TAU + t * 6
    const d = (1 - ((k * 2 + i / 6) % 1)) * 12
    px(ctx, a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, i % 2 ? '#f8b0e0' : '#ffffff')
  }
  blitCentered(ctx, ellipse(r + 2, r + 2, 'rgba(248,88,168,0.45)'), a.x, a.y)
  blitCentered(ctx, ellipse(r, r, '#f878c0'), a.x, a.y)
  blitCentered(ctx, ellipse(Math.max(1, r - 2), Math.max(1, r - 2), '#ffffff'), a.x, a.y)
}

const drawPsystrike = (ctx: Ctx, a: Attack, t: number) => {
  const m = a.motion
  const r = Math.max(3, Math.round(radiusOf(a) * 0.75))
  const vx = 'vx' in m ? m.vx : 0
  const vy = 'vy' in m ? m.vy : 0
  const len = Math.hypot(vx, vy) || 1
  // A comet tail behind the orb.
  for (let i = 1; i <= 10; i++) {
    const k = i / 10
    const w = Math.max(1, Math.round((1 - k) * r * 1.4))
    px(ctx, a.x - (vx / len) * i * 2.2 - w / 2, a.y - (vy / len) * i * 2.2 - w / 2, k < 0.4 ? '#f878c0' : k < 0.7 ? '#c84898' : 'rgba(160,48,120,0.6)', w, w)
  }
  blitCentered(ctx, ellipse(r + 2, r + 2, 'rgba(248,88,168,0.45)'), a.x, a.y)
  blitCentered(ctx, ellipse(r, r, '#f878c0'), a.x, a.y)
  blitCentered(ctx, ellipse(Math.max(1, r - 2), Math.max(1, r - 2), '#ffffff'), a.x, a.y)
  if (Math.floor(t * 16 + a.id) % 3 === 0) dashedRing(ctx, a.x, a.y, r + 4, t * 8, ['#f8b0e0'], 0.5)
}

export const drawTmAir = (ctx: Ctx, g: Game, t: number, visible: (x: number, y: number, m?: number) => boolean) => {
  drawBeams(ctx, g, t)
  for (const a of g.attacks) {
    if (a.age < 0 || !visible(a.x, a.y, 120)) continue
    switch (a.visual) {
      case 'rockSlide':
        drawRock(ctx, a)
        break
      case 'yawn':
        drawYawnBubble(ctx, a, t)
        break
      case 'discharge':
        drawDischarge(ctx, a, t)
        break
      case 'heatWave':
        drawHeatWave(ctx, a, t)
        break
      case 'thunderFang':
        drawFang(ctx, a, t)
        break
      case 'lavaPlume':
        drawGeyser(ctx, a)
        break
      case 'ancientRise':
        drawAncientRise(ctx, a)
        break
      case 'ancientRock':
        drawAncientRock(ctx, a, t)
        break
      case 'icyWind':
        drawIcyWind(ctx, a, t)
        break
      case 'ironShard':
        drawIronShard(ctx, a)
        break
      case 'psyHover':
        drawPsyHover(ctx, a, t)
        break
      case 'psystrike':
        drawPsystrike(ctx, a, t)
        break
    }
  }
}

/* ---------------- On the player ---------------- */

/** Iron Head's iron body: a steel shell with a glint sweeping across, brighter while the block is up. */
const drawIronBody = (ctx: Ctx, g: Game, a: Attack, t: number) => {
  const p = g.player
  const r = radiusOf(a)
  const guarding = p.guard?.move === 'ironHead'
  ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.3) * (guarding ? 1 : 0.7)
  dashedRing(ctx, p.x, p.y - 10, r, t * 2.5, guarding ? ['#ffffff', '#c8d0e0', '#8890a8'] : ['#c8d0e0', '#8890a8'], 0.75, 0.9)
  const sweep = ((t * 0.9 + a.id * 0.1) % 1) * TAU
  for (let i = -2; i <= 2; i++) {
    const ang = sweep + i * 0.08
    px(ctx, p.x + Math.cos(ang) * r, p.y - 10 + Math.sin(ang) * r * 0.9, '#ffffff', 2, 2)
  }
  ctx.globalAlpha = 1
}

export const drawTmPlayer = (ctx: Ctx, g: Game, t: number) => {
  const p = g.player
  for (const a of g.attacks) if (a.visual === 'ironHead' && a.age >= 0) drawIronBody(ctx, g, a, t)
  // Discharge's charge crackles around the player as they walk.
  const discharge = p.moves.find((m) => m.id === 'discharge')
  if (discharge) {
    const charge = dischargeCharge(walkedSince(discharge, p))
    const sparks = Math.round(charge * 5)
    const seed = Math.floor(t * 14)
    for (let i = 0; i < sparks; i++) {
      if (hash2(seed, i) < 0.45) continue
      const ang = hash2(seed, i, 1) * TAU
      const d = 9 + hash2(seed, i, 2) * 6
      const x = p.x + Math.cos(ang) * d
      const y = p.y - 10 + Math.sin(ang) * d
      zigzag(ctx, x, y, x + Math.cos(ang) * 4, y + Math.sin(ang) * 4, 2, seed + i, ['#f8d030', '#ffffff'])
    }
    if (charge >= 1 && Math.floor(t * 8) % 2 === 0) dashedRing(ctx, p.x, p.y - 10, 15, t * 4, ['#fff8a0', '#f8d030'], 0.4)
  }
  // Ancient Power's boost: golden motes rising off the player.
  if (p.moveBuffs.some((b) => b.move === 'ancientPower')) {
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.9 + i / 6) % 1
      const x = p.x + Math.sin(i * 2.1 + t * 2) * 9
      const y = p.y - 2 - ph * 26
      ctx.globalAlpha = 1 - ph
      px(ctx, x, y, i % 2 ? '#f8d870' : '#fff8d0', ph < 0.3 ? 2 : 1, ph < 0.3 ? 2 : 1)
    }
    ctx.globalAlpha = 1
  }
}

/* ---------------- TM discs ---------------- */

/** A TM disc on the ground: its type's color, a gold rim and sparkles for a legendary one, a glint passing over. */
export const drawTmDisc = (ctx: Ctx, k: Extract<Pickup, { kind: 'tm' }>, x: number, y: number, t: number) => {
  const gold = k.source === 'legendary'
  const color = TYPE_COLORS[MOVES[k.move].type]
  if (!k.attracted) blitCentered(ctx, ellipse(9, 9, gold ? 'rgba(248,208,48,0.25)' : 'rgba(255,255,255,0.18)'), x, y)
  blitCentered(ctx, tmDisc(color, gold), x, y)
  const phase = (t * 0.7 + k.id * 0.13) % 1
  if (phase < 0.25) {
    const s = Math.round(-5 + phase * 40)
    px(ctx, x + s, y - 5 + Math.round(phase * 10), 'rgba(255,255,255,0.85)')
  }
  const n = gold ? 4 : 2
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.8 + i / n + k.id * 0.37) % 1
    if (ph > 0.4) continue
    const ang = (i / n) * TAU + k.id
    const sx = x + Math.cos(ang) * 9
    const sy = y + Math.sin(ang) * 7 - 2
    const c = gold ? '#fff0a0' : '#ffffff'
    px(ctx, sx, sy, c)
    if (ph < 0.2) {
      px(ctx, sx - 1, sy, c)
      px(ctx, sx + 1, sy, c)
      px(ctx, sx, sy - 1, c)
      px(ctx, sx, sy + 1, c)
    }
  }
}
