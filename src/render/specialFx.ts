import { blitCentered, blitRotated, context2d, createCanvas, ellipse, fromStrings, type PixelSprite } from '../engine/pixelart'
import { TAU } from '../engine/math'
import { TYPE_COLORS } from '../data/types'
import { resolveSpecial, specialReach, type SpecialId } from '../game/special'
import type { Attack, Game } from '../game/types'
import { FX, outlined, toIconUrl } from './art'

/** Code-drawn pixel art for the special attacks (`game/special.ts`). */

type Ctx = CanvasRenderingContext2D

const lazy = <T>(build: () => T) => {
  let value: T | undefined
  return () => (value ??= build())
}

const ROOT = [
  '....1....', '...151...', '...121...', '..1231...', '..12321..', '.512321..', '1.12321..',
  '..1233215', '..12321.1', '.1233321.', '.1243321.', '12344321.', '123443321', '124444421',
]
const ROOT_PALETTE = { 1: '#20140c', 2: '#6a4020', 3: '#a87038', 4: '#58a838', 5: '#a8e870' }

const ROOTS = lazy(() => [fromStrings(ROOT, ROOT_PALETTE), fromStrings(ROOT, ROOT_PALETTE, { mirror: true })])

/** Hard-edged circle outline plotted point by point (cheap for big, growing rings). */
const pixelRing = (ctx: Ctx, x: number, y: number, r: number, thickness: number, color: string) => {
  ctx.fillStyle = color
  for (let k = 0; k < thickness; k++) {
    const rr = r - k
    if (rr <= 0) return
    const steps = Math.max(8, Math.ceil(rr * TAU))
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU
      ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 1, 1)
    }
  }
}

const slabCache = new Map<string, PixelSprite>()

/** One slice of the water beam: blue edges, white core, with flowing streaks (2 frames). */
const beamSlab = (width: number, frame: number) => {
  const key = `${width}|${frame}`
  const cached = slabCache.get(key)
  if (cached) return cached
  const len = 11
  const canvas = createCanvas(len, width)
  const ctx = context2d(canvas)
  const half = width / 2
  for (let y = 0; y < width; y++) {
    const d = Math.abs(y + 0.5 - half) / half
    for (let x = 0; x < len; x++) {
      const streak = d > 0.25 && d < 0.6 && (x + frame * 2 + y * 3) % 6 === 0
      ctx.fillStyle = streak ? '#ffffff' : d > 0.8 ? '#2848b0' : d > 0.52 ? '#6890f0' : d > 0.24 ? '#a8d0f8' : '#ffffff'
      ctx.fillRect(x, y, 1, 1)
    }
  }
  slabCache.set(key, canvas)
  return canvas
}

const radius = (a: Attack) => (a.shape.kind === 'circle' ? a.shape.r : 0)

/** Ground layer (under entities): scorch marks, cracks, glows. */
export const drawSpecialGround = (ctx: Ctx, a: Attack) => {
  const r = Math.round(radius(a))
  switch (a.visual) {
    case 'fireTrail': {
      ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.4)
      blitCentered(ctx, ellipse(r, Math.max(1, Math.round(r * 0.5)), 'rgba(56,16,8,0.4)'), a.x, a.y + 2)
      ctx.globalAlpha = 1
      return
    }
    case 'blitz':
      return blitCentered(ctx, ellipse(r + 4, Math.round((r + 4) * 0.5), 'rgba(248,128,48,0.4)'), a.x, a.y + 8)
    case 'roots':
      return blitCentered(ctx, ellipse(Math.round(r * 0.8), Math.max(1, Math.round(r * 0.35)), 'rgba(40,24,8,0.5)'), a.x, a.y)
  }
}

/** Effect layer (above entities). */
export const drawSpecialAttack = (ctx: Ctx, a: Attack, t: number) => {
  const r = radius(a)
  switch (a.visual) {
    case 'fireTrail': {
      const left = a.ttl - a.age
      if (left < 0.3 && Math.floor(left * 30) % 2 === 0) return
      const frames = FX.flame()
      return blitCentered(ctx, frames[(Math.floor((t + a.id * 0.37) * 10) + (a.flip ? 1 : 0)) % 2]!, a.x, a.y - 4)
    }
    case 'blitz': {
      blitCentered(ctx, ellipse(Math.round(r), Math.round(r), 'rgba(248,160,48,0.35)'), a.x, a.y)
      pixelRing(ctx, a.x, a.y, Math.round(r), 2, Math.floor(t * 20) % 2 ? '#f8d030' : '#fff8c0')
      const frames = FX.flame()
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU + a.age * 18
        blitCentered(ctx, frames[i % 2]!, a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r * 0.8)
      }
      return
    }
    case 'blast': {
      const R = Math.round(r)
      // Translucent fireball while it deals damage, then a fading shock ring.
      if (a.age > a.activeUntil) {
        const k = (a.age - a.activeUntil) / (a.ttl - a.activeUntil)
        ctx.globalAlpha = Math.max(0, 1 - k)
        pixelRing(ctx, a.x, a.y, R + Math.round(k * 10), 3, '#f08030')
        pixelRing(ctx, a.x, a.y, R + Math.round(k * 10) - 3, 1, '#fff8c0')
        ctx.globalAlpha = 1
        return
      }
      ctx.globalAlpha = 0.8
      blitCentered(ctx, ellipse(R, R, '#c03020'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(R * 0.78), Math.round(R * 0.78), '#f08030'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(R * 0.52), Math.round(R * 0.52), '#f8d030'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(R * 0.26), Math.round(R * 0.26), '#ffffff'), a.x, a.y)
      pixelRing(ctx, a.x, a.y, R + 3, 1, '#fff8c0')
      ctx.globalAlpha = 1
      return
    }
    case 'beam': {
      if (a.age < a.activeFrom) return
      const on = a.age - a.activeFrom
      const left = a.ttl - a.age
      const swell = Math.min(1, on / 0.06) * Math.min(1, left / 0.15)
      const width = Math.max(2, Math.round(r * 2 * swell * (0.88 + 0.12 * Math.sin(t * 50))))
      const angle = Math.atan2(a.y - a.from.y, a.x - a.from.x)
      blitRotated(ctx, beamSlab(width, Math.floor(t * 20) % 2), a.x, a.y, angle)
      // Muzzle splash on the first segment.
      if ((a.x - a.from.x) ** 2 + (a.y - a.from.y) ** 2 < 15 ** 2) {
        const m = Math.round(width * 0.6)
        blitCentered(ctx, ellipse(m, m, '#a8d0f8'), a.from.x, a.from.y)
        blitCentered(ctx, ellipse(Math.round(m * 0.6), Math.round(m * 0.6), '#ffffff'), a.from.x, a.from.y)
      }
      return
    }
    case 'roots': {
      const sprite = ROOTS()[a.flip ? 1 : 0]!
      const scale = Math.max(1, Math.round(r / 7))
      const grow = Math.min(1, a.age / 0.08) * Math.min(1, (a.ttl - a.age) / 0.2)
      const rows = Math.round(sprite.height * grow)
      if (rows <= 0) return
      const w = sprite.width * scale
      ctx.drawImage(sprite, 0, 0, sprite.width, rows, Math.round(a.x - w / 2), Math.round(a.y + 2 - rows * scale), w, rows * scale)
      return
    }
    case 'nova': {
      const R = Math.round(r)
      ctx.globalAlpha = Math.max(0, 1 - a.age / a.ttl)
      pixelRing(ctx, a.x, a.y, R, 3, TYPE_COLORS[a.type])
      pixelRing(ctx, a.x, a.y, R - 4, 1, '#ffffff')
      pixelRing(ctx, a.x, a.y, Math.round(R * 0.7), 1, '#f8f8e0')
      ctx.globalAlpha = 1
      return
    }
  }
}

/** Charge-up: a shrinking type-colored ring and, for aimed specials, a dotted aim line. */
export const drawSpecialAura = (ctx: Ctx, g: Game, t: number) => {
  const s = g.special
  if (s.charge <= 0) return
  const p = g.player
  const r = resolveSpecial(g.starter, g.player.stage)
  const { def } = r
  const k = s.charge / def.charge
  const color = TYPE_COLORS[def.type]
  pixelRing(ctx, p.x, p.y - 10, Math.round(8 + k * 20), 2, Math.floor(t * 24) % 2 ? color : '#ffffff')
  const reach = specialReach(g, r) * (1 - k * 0.5)
  ctx.fillStyle = color
  for (let d = 14; d < reach; d += 6) {
    if (Math.floor(d / 6 - t * 20) % 3 === 0) continue
    ctx.fillRect(Math.round(p.x + p.facing.x * d), Math.round(p.y - 8 + p.facing.y * d), 2, 2)
  }
}

/* ---------------- Icons ---------------- */

const FIRE = { 1: '#a82010', 2: '#e05018', 3: '#f8a030', 4: '#fff0a0' }
const ICON_ART: Record<SpecialId, () => PixelSprite> = {
  blastBurn: () =>
    outlined(fromStrings(
      ['.....1.....', '.1...21..1.', '.21.1321.2.', '..1123321..', '.112344321.', '12344443211', '.123444321.', '..1234321..', '.1.12321.1.', '.2..121..2.', '.....1.....'],
      FIRE,
    )),
  hydroCannon: () =>
    outlined(fromStrings(
      ['....11111...', '..112344411.', '.12344...41.', '12344.....1.', '1234........', '12341.......', '123341...11.', '1223341.1331', '.12223322221', '..1111111111'],
      { 1: '#2848b0', 2: '#6890f0', 3: '#a8d0f8', 4: '#ffffff' },
    )),
  frenzyPlant: () => ROOTS()[0]!,
  boomburst: () =>
    outlined(fromStrings(
      ['......1...', '...1...1..', '.1..1...1.', '121..1..1.', '1221.1..1.', '121..1..1.', '.1..1...1.', '...1...1..', '......1...'],
      { 1: '#f8f0d0', 2: '#a8a878' },
    ), '#383028'),
}

export const specialIcon = (id: SpecialId) => toIconUrl(`special:${id}`, ICON_ART[id])
