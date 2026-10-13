import { blitCentered, blitRotated, ellipse, ring } from '../engine/pixelart'
import type { Attack } from '../game/types'
import { FX } from './art'
import { bolt, dashedRing } from './strokes'

/**
 * Visuals for evolved moves. Kept apart from `draw.ts` so the base move art
 * stays readable; both are called from the same frame passes.
 */

type Ctx = CanvasRenderingContext2D

const fadeOut = (a: Attack, window: number) => Math.max(0, Math.min(1, (a.ttl - a.age) / window))

/** Ground layer (under Pokémon): puddles and strike warnings. */
export const drawEvolvedGround = (ctx: Ctx, a: Attack, t: number) => {
  if (a.shape.kind !== 'circle') return
  const r = a.shape.r
  switch (a.visual) {
    case 'gunk': {
      if (a.age < a.activeFrom) return
      const grow = Math.min(1, (a.age - a.activeFrom) / 0.12)
      ctx.globalAlpha = fadeOut(a, 0.3)
      blitCentered(ctx, ellipse(Math.round(r * grow), Math.round(r * 0.72 * grow), 'rgba(40,24,48,0.6)'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(r * 0.78 * grow), Math.round(r * 0.54 * grow), 'rgba(106,58,120,0.6)'), a.x, a.y - 1)
      blitCentered(ctx, ellipse(Math.round(r * 0.4 * grow), Math.round(r * 0.26 * grow), 'rgba(136,160,56,0.55)'), a.x + r * 0.2, a.y + 1)
      // Popping bubbles.
      for (let i = 0; i < 4; i++) {
        const phase = (t * 1.4 + i * 0.37 + a.id * 0.13) % 1
        const bx = Math.round(a.x + Math.cos(i * 2.4 + a.id) * r * 0.55)
        const by = Math.round(a.y + Math.sin(i * 1.7 + a.id) * r * 0.35)
        blitCentered(ctx, ring(1 + Math.round(phase * 2), 1, '#c890d8'), bx, by)
      }
      ctx.globalAlpha = 1
      return
    }
    case 'wildbolt': {
      if (a.age < a.activeFrom) {
        if (Math.floor(a.age * 30) % 2 === 0) blitCentered(ctx, ring(Math.round(r), 1, '#a8f0ff'), a.x, a.y)
        return
      }
      ctx.globalAlpha = fadeOut(a, 0.3) * 0.7
      blitCentered(ctx, ellipse(Math.round(r * 0.7), Math.round(r * 0.35), 'rgba(24,32,48,0.5)'), a.x, a.y)
      ctx.globalAlpha = 1
      return
    }
  }
}

/** Overlay layer (above Pokémon). */
export const drawEvolvedAttack = (ctx: Ctx, a: Attack, t: number) => {
  const m = a.motion
  switch (a.visual) {
    case 'flamethrower': {
      if (a.shape.kind !== 'circle') return
      const r = a.shape.r
      const flick = Math.floor((t + a.id) * 20) % 2
      ctx.globalAlpha = fadeOut(a, 0.25)
      blitCentered(ctx, ellipse(Math.round(r), Math.round(r), '#c03018'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(r * 0.75), Math.round(r * 0.75), '#f07020'), a.x, a.y - flick)
      blitCentered(ctx, ellipse(Math.round(r * 0.48), Math.round(r * 0.48), '#f8c040'), a.x, a.y - 1)
      blitCentered(ctx, ellipse(Math.round(r * 0.22), Math.round(r * 0.22), '#fff8c0'), a.x, a.y - 1)
      ctx.globalAlpha = 1
      return
    }
    case 'fireBlast': {
      if (a.shape.kind !== 'circle') return
      const r = Math.round(a.shape.r)
      ctx.globalAlpha = fadeOut(a, 0.3)
      blitCentered(ctx, ellipse(r, r, 'rgba(248,120,40,0.28)'), a.x, a.y - 2)
      blitCentered(ctx, FX.fireBlast()[Math.floor((t + a.id) * 10) % 2]!, a.x, a.y - 2)
      ctx.globalAlpha = 1
      return
    }
    case 'hydroPump': {
      const angle = m.kind === 'linear' ? Math.atan2(m.vy, m.vx) : 0
      return blitRotated(ctx, FX.hydroPump(), a.x, a.y, angle)
    }
    case 'surf': {
      if (a.shape.kind !== 'circle') return
      const r = a.shape.r
      ctx.globalAlpha = 1 - a.age / a.ttl
      dashedRing(ctx, a.x, a.y, r - 3, a.age * 12, ['#2848b0', '#4878e8'], 0.95, 0.7)
      dashedRing(ctx, a.x, a.y, r - 1.5, a.age * 12, ['#4878e8', '#68a0f0'], 0.95, 0.7)
      dashedRing(ctx, a.x, a.y, r, a.age * 12, ['#a8d8f8', '#ffffff'], 0.9, 0.7)
      dashedRing(ctx, a.x, a.y, r + 1.5, -a.age * 16, ['#ffffff'], 0.4, 0.7)
      ctx.globalAlpha = 1
      return
    }
    case 'leafStorm':
      return blitRotated(ctx, FX.leafStorm(), a.x, a.y, a.age * 18)
    case 'powerWhip': {
      if (a.shape.kind !== 'rect') return
      const dir = a.flip ? -1 : 1
      const reach = a.shape.w * Math.min(1, a.age / 0.08)
      const startX = a.x - (dir * a.shape.w) / 2
      ctx.globalAlpha = fadeOut(a, 0.1)
      for (let i = 0; i < reach; i++) {
        const x = Math.round(startX + dir * i)
        const y = Math.round(a.y + Math.sin(i * 0.18 - a.age * 36) * 3)
        ctx.fillStyle = '#183818'
        ctx.fillRect(x, y - 3, 1, 7)
        ctx.fillStyle = i % 11 < 2 ? '#a8e870' : '#3c8c2c'
        ctx.fillRect(x, y - 2, 1, 4)
        ctx.fillStyle = '#58b838'
        ctx.fillRect(x, y - 2, 1, 1)
        // Thorns, alternating above and below.
        if (i % 8 === 4) {
          const up = (i >> 3) % 2 === 0 ? -1 : 1
          ctx.fillStyle = '#e8e0a0'
          ctx.fillRect(x, y + up * 4, 1, 1)
          ctx.fillRect(x, y + up * 5, 1, 1)
        }
      }
      // Leafy tip.
      if (reach >= a.shape.w - 1) {
        const tipX = Math.round(startX + dir * a.shape.w)
        ctx.fillStyle = '#78c850'
        ctx.fillRect(tipX - 2, Math.round(a.y) - 3, 4, 5)
      }
      ctx.globalAlpha = 1
      return
    }
    case 'triAttack':
      return blitRotated(ctx, FX.triAttack()[a.id % 3]!, a.x, a.y, a.age * 10)
    case 'wildbolt': {
      if (a.age < a.activeFrom || a.shape.kind !== 'circle') return
      const r = a.shape.r
      const fade = 1 - (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
      ctx.globalAlpha = Math.max(0, fade)
      bolt(ctx, a.x, a.y, 200, { width: 5, edge: '#58c8f8', core: '#ffffff' })
      bolt(ctx, a.x + 3, a.y, 120, { width: 3, edge: '#f8e030', core: '#fff8c0' })
      blitCentered(ctx, ellipse(Math.round(r), Math.round(r * 0.5), 'rgba(168,240,255,0.6)'), a.x, a.y)
      blitCentered(ctx, ring(Math.round(r * (1 + (a.age - a.activeFrom) * 3)), 1, '#e0ffff'), a.x, a.y)
      ctx.globalAlpha = 1
      return
    }
    case 'gunk': {
      // Lobbed garbage blob; the puddle is drawn on the ground layer.
      if (a.age >= a.activeFrom) return
      const k = a.age / a.activeFrom
      const x = a.from.x + (a.x - a.from.x) * k
      const y = a.from.y + (a.y - a.from.y) * k - Math.sin(k * Math.PI) * 50
      blitCentered(ctx, ellipse(5, 4, '#281830'), x, y)
      blitCentered(ctx, ellipse(4, 3, '#6a3a78'), x - 1, y - 1)
      return blitCentered(ctx, ellipse(1, 1, '#88a038'), x + 1, y - 1)
    }
    case 'hurricane': {
      if (a.shape.kind !== 'circle') return
      const r = a.shape.r
      ctx.globalAlpha = Math.min(1, a.age / 0.2) * fadeOut(a, 0.4)
      // Funnel of spinning rings, narrow at the ground and wide at the top.
      for (let k = 0; k < 7; k++) {
        const rr = r * (0.3 + k * 0.14)
        const sway = Math.sin(t * 6 + k * 0.7) * 2
        dashedRing(ctx, a.x + sway, a.y + 6 - k * 5, rr, t * 14 + k, k % 2 ? ['#ffffff', '#b8c0dc'] : ['#e8eefc', '#7880a8'], 0.8, 0.35)
      }
      ctx.globalAlpha = 1
      return
    }
  }
}
