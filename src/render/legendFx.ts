import { blitCentered, blitRotated, ellipse, ring } from '../engine/pixelart'
import { TAU } from '../engine/math'
import { hash2 } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { domainOf } from '../data/domains'
import { onFloor } from '../game/arenaFloor'
import { parked, safeAt } from '../game/bosses'
import { phasesOf } from '../game/bossFight'
import { arenaPoint, domainHere } from '../game/domain'
import { encounterBeat, REVEAL_AT } from '../game/domainRules'
import type { Enemy, Game, Hazard } from '../game/types'
import type { RiftLegend } from '../data/rifts'
import { art, lazy } from './art'
import { HAZARD_COLORS } from './hazardColors'
import { drawPokemon, formOf, sprites } from './sprites'

type Ctx = CanvasRenderingContext2D

/**
 * The legendary bosses' moments on screen (`game/bosses.ts`, `game/domain.ts`):
 * beams (blinking telegraph lines, then the burn), a dash's lane, a dive's
 * wake, a blast's charge with its safe spots glowing, the phase shift, the
 * encounter's entrance, and an arrow to a legendary off screen.
 */

/** Steps along a beam from (x, y) at `angle` for `len` px every `step` px, calling `dot` with each point. */
const along = (h: Pick<Hazard, 'x' | 'y' | 'angle' | 'len'>, step: number, dot: (x: number, y: number, i: number) => void) => {
  const dx = Math.cos(h.angle)
  const dy = Math.sin(h.angle)
  for (let d = 0, i = 0; d <= h.len; d += step, i++) dot(Math.round(h.x + dx * d), Math.round(h.y + dy * d), i)
}

/**
 * Ground layer of a beam: its warning, a dashed line that fills in and blinks
 * faster as it's about to burn (a dash's lane shows its two edges instead).
 */
export const drawBeamGround = (ctx: Ctx, h: Hazard) => {
  if (h.age >= h.armAt) return
  const k = h.age / h.armAt
  if (Math.floor(h.age * (5 + k * 16)) % 3 === 2) return
  const [line] = HAZARD_COLORS[h.visual]
  const shown = Math.min(1, k * 2.5)
  const nx = -Math.sin(h.angle) * h.r
  const ny = Math.cos(h.angle) * h.r
  const len = h.len * shown
  if (h.damage <= 0) {
    ctx.fillStyle = '#f8f0e0'
    along({ ...h, len }, 5, (x, y) => {
      ctx.fillRect(Math.round(x + nx), Math.round(y + ny), 2, 2)
      ctx.fillRect(Math.round(x - nx), Math.round(y - ny), 2, 2)
    })
    return
  }
  ctx.fillStyle = line
  along({ ...h, len }, 4, (x, y, i) => {
    if (i % 2 === 0) ctx.fillRect(x - 1, y - 1, 2, 2)
  })
  // A sweeping beam also shows where it ends and the arc it burns through, so the safe side reads at a glance.
  if (h.spin !== 0) {
    const end = h.angle + h.spin * (h.disarmAt - h.armAt)
    along({ ...h, angle: end, len }, 4, (x, y, i) => {
      if (i % 2 === 0) ctx.fillRect(x - 1, y - 1, 2, 2)
    })
    // The whole wedge it burns through, dotted every few px (sparser near the tip, where it's narrow).
    const arc = Math.abs(end - h.angle)
    ctx.globalAlpha = 0.55
    for (let r = 16; r <= len; r += 9) {
      const n = Math.max(1, Math.round((arc * r) / 9))
      for (let i = 0; i <= n; i++) {
        const a = h.angle + ((end - h.angle) * i) / n
        ctx.fillRect(Math.round(h.x + Math.cos(a) * r), Math.round(h.y + Math.sin(a) * r), 2, 2)
      }
    }
    ctx.globalAlpha = 1
  }
  // The beam's width, faint, so the player sees how far to step.
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  along({ ...h, len }, 8, (x, y) => {
    ctx.fillRect(Math.round(x + nx), Math.round(y + ny), 1, 1)
    ctx.fillRect(Math.round(x - nx), Math.round(y - ny), 1, 1)
  })
}

/** Stone blades bursting out of the ground along a rock beam (Precipice Blades): they shoot up, stand, then sink as it ends. */
const drawBlades = (ctx: Ctx, h: Hazard, g: Game) => {
  const rise = Math.min(1, (h.age - h.armAt) / 0.1)
  const sink = h.age > h.disarmAt ? Math.max(0, 1 - (h.age - h.disarmAt) / 0.25) : 1
  const tall = Math.round((h.r * 1.6 + 5) * rise * sink)
  if (tall <= 0) return
  const room = g.rift.arena ?? g.place.inside
  along(h, 7, (x, y, i) => {
    // Blades only burst out of the ground, never over the void past it.
    if (room && !onFloor(room.layout.floor, x - room.x, y - room.y)) return
    const t = tall - (i % 3 === 1 ? 4 : 0)
    for (let row = 0; row < t; row++) {
      const half = Math.max(0, Math.round(((t - row) / t) * 4))
      ctx.fillStyle = row === t - 1 ? '#f0d8a0' : '#5a3a20'
      ctx.fillRect(x - half - 1, y - row, half * 2 + 2, 1)
      if (half > 0) {
        ctx.fillStyle = row > t * 0.6 ? '#e0c068' : '#a07840'
        ctx.fillRect(x - half, y - row, half, 1)
        ctx.fillStyle = '#785028'
        ctx.fillRect(x, y - row, half, 1)
      }
    }
  })
}

/** Air layer of a beam once it burns: a colored band with a white core, flickering, fading as it ends (a rock one erupts in stone blades). */
export const drawBeamAir = (ctx: Ctx, h: Hazard, t: number, g: Game) => {
  if (h.age < h.armAt || h.damage <= 0) return
  if (h.visual === 'rock') return drawBlades(ctx, h, g)
  const [line] = HAZARD_COLORS[h.visual]
  const fade = h.age > h.disarmAt ? Math.max(0, 1 - (h.age - h.disarmAt) / 0.25) : 1
  if (fade <= 0) return
  const w = Math.max(2, Math.round(h.r * 2 * (0.85 + 0.15 * Math.sin(t * 40))))
  const core = Math.max(1, Math.round(w * 0.4))
  ctx.globalAlpha = fade
  ctx.fillStyle = line
  along(h, 2, (x, y) => ctx.fillRect(x - (w >> 1), y - 6 - (w >> 1), w, w))
  ctx.fillStyle = '#ffffff'
  along(h, 2, (x, y) => ctx.fillRect(x - (core >> 1), y - 6 - (core >> 1), core, core))
  ctx.globalAlpha = 1
}

/** Ground marks of every boss's script: a dive's wake following the player, the glow of a phase shift. */
export const drawBossGround = (ctx: Ctx, g: Game, t: number) => {
  for (const e of g.enemies) {
    const f = e.fight
    if (!f || e.dying >= 0) continue
    const m = f.motion
    if (m?.kind === 'dive' && m.left > m.lock && (m.visual === 'dragon' || m.visual === 'aero')) {
      // From the sky: its shadow follows the player, growing as it comes down.
      const k = Math.max(0, 1 - (m.left - m.lock) / 1.6)
      const x = Math.round(m.x)
      const y = Math.round(m.y)
      blitCentered(ctx, ellipse(Math.round(10 + k * 12), Math.round(4 + k * 5), 'rgba(8,16,24,0.5)'), x, y)
      const [line] = HAZARD_COLORS[m.visual]
      const q = (t * 2) % 1
      ctx.globalAlpha = 1 - q
      blitCentered(ctx, ring(Math.round(26 - q * 16), 1, line), x, y)
      ctx.globalAlpha = 1
    } else if (m?.kind === 'dive' && m.left > m.lock) {
      const [line, fill] = HAZARD_COLORS[m.visual]
      const x = Math.round(m.x)
      const y = Math.round(m.y)
      blitCentered(ctx, ellipse(16, 7, 'rgba(8,16,40,0.45)'), x, y)
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.6 + i / 3) % 1
        const r = Math.round(4 + k * 18)
        ctx.globalAlpha = 1 - k
        blitCentered(ctx, ring(r, 1, i % 2 ? line : '#ffffff'), x, y)
      }
      ctx.globalAlpha = 1
      blitCentered(ctx, ellipse(6, 3, fill), x, y)
    }
    if (f.shift > 0 && !parked(e)) {
      const k = (t * 2) % 1
      ctx.globalAlpha = 1 - k
      blitCentered(ctx, ring(Math.round(e.radius + 6 + k * 30), 2, '#f8f0a0'), Math.round(e.x), Math.round(e.y))
      ctx.globalAlpha = 1
    }
  }
}

/** Grid step (px) of the safe-spot dots a blast's warning shows. */
const SAFE_STEP = 7

/**
 * A blast charging, in screen space: the screen dims more and more, the spots
 * it spares glow with dots (the same test the blast lands with), and a ring
 * closes on the boss.
 */
export const drawBlasts = (ctx: Ctx, g: Game, camX: number, camY: number, t: number) => {
  for (const e of g.enemies) {
    const b = e.fight?.blast
    if (!b || e.dying >= 0) continue
    const k = 1 - b.left / b.total
    const { w, h } = g.view
    ctx.fillStyle = `rgba(4,8,32,${(0.18 + k * 0.32).toFixed(2)})`
    ctx.fillRect(0, 0, w, h)
    const blink = Math.floor(t * (4 + k * 10)) % 2 === 0
    ctx.fillStyle = blink ? '#f8fff0' : '#98f8b0'
    // Only floor counts: the void past it isn't anywhere to stand.
    const room = g.rift.arena ?? g.place.inside
    const floor = room ? room.layout.floor : []
    const ox = room?.x ?? 0
    const oy = room?.y ?? 0
    const x0 = Math.floor(camX / SAFE_STEP) * SAFE_STEP
    const y0 = Math.floor(camY / SAFE_STEP) * SAFE_STEP
    for (let y = y0; y < camY + h; y += SAFE_STEP) {
      for (let x = x0; x < camX + w; x += SAFE_STEP) {
        if ((!room || onFloor(floor, x - ox, y - oy)) && safeAt(g, b, x, y, g.player.radius)) ctx.fillRect(x - camX, y - camY, 2, 2)
      }
    }
    const [line] = HAZARD_COLORS[b.visual]
    const r = Math.round(10 + (1 - k) * 60)
    blitCentered(ctx, ring(r, 2, line), Math.round(b.x - camX), Math.round(b.y - 14 - camY))
  }
}

const ARROW = lazy(() => art(['11.....', '1221...', '122221.', '1222221', '122221.', '1221...', '11.....'], { 1: '#f8d0d0', 2: '#d02838' }, '#300810'))

/** In a domain's battle, an arrow on the screen's edge toward the legendary while it's off screen (or its wake, while it dives). */
export const drawBossMarker = (ctx: Ctx, g: Game, camX: number, camY: number, t: number) => {
  const here = domainHere(g)
  if (!here || here.d.act !== 'battle') return
  const boss = g.enemies.find((e) => e.id === here.d.bossId)
  if (!boss) return
  const m = boss.fight?.motion
  const tx = m?.kind === 'dive' ? m.x : boss.x
  const ty = m?.kind === 'dive' ? m.y : boss.y - boss.radius
  if (parked(boss) && m?.kind !== 'dive') return
  const { w, h } = g.view
  const sx = tx - camX
  const sy = ty - camY
  if (sx > 0 && sx < w && sy > 0 && sy < h) return
  const cx = w / 2
  const cy = h / 2
  const angle = Math.atan2(sy - cy, sx - cx)
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const k = Math.min(dx > 0 ? (w - 14 - cx) / dx : dx < 0 ? (14 - cx) / dx : Infinity, dy > 0 ? (h - 40 - cy) / dy : dy < 0 ? (90 - cy) / dy : Infinity)
  const bob = Math.sin(t * 8) * 2
  blitRotated(ctx, ARROW(), cx + dx * (k + bob), cy + dy * (k + bob), angle, 2)
}

/** The sprite form a boss wears in its phase (`BossPhase.form`), if its species has it. */
export const bossForm = (e: Enemy) => {
  const key = e.fight ? phasesOf(e.kind)?.[e.fight.phase]?.form : undefined
  return formOf(ENEMIES[e.kind].dex, key)
}

/** How a legendary's entrance colors its rings, the tint it rises out of and the spray off its back. */
type EntranceLook = { ring: string; tint: string; spray: string }

const WATER_RISE: EntranceLook = { ring: '#c8e8f8', tint: '#1c4878', spray: '#e8f8ff' }

/** Entrances that don't come out of water (the rest use `WATER_RISE`). */
const ENTRANCE_LOOK: Partial<Record<RiftLegend, EntranceLook>> = {
  groudon: { ring: '#f8a040', tint: '#a02808', spray: '#f8e060' },
  rayquaza: { ring: '#f8f0a0', tint: '#3c9850', spray: '#ffffff' },
}

/**
 * The legendary's entrance during the encounter, before it's in play: rings
 * spread where it comes, then it rises out of the water (clipped at the
 * surface), drops from the sky with its shadow growing, or fades in.
 */
export const drawEntrance = (ctx: Ctx, g: Game, t: number) => {
  const here = domainHere(g)
  if (!here || here.d.act !== 'encounter' || here.d.scene >= REVEAL_AT) return
  const { arena, d } = here
  const def = domainOf(d.legend)!
  const k = encounterBeat(d.scene).entrance
  const at = arenaPoint(arena, d, def.arena.boss)
  const x = Math.round(at.x)
  const y = Math.round(at.y)
  const look = ENTRANCE_LOOK[d.legend] ?? WATER_RISE
  for (let i = 0; i < 3; i++) {
    const q = (t * 1.2 + i / 3) % 1
    ctx.globalAlpha = (1 - q) * Math.min(1, k * 3 + 0.3)
    blitCentered(ctx, ring(Math.round(8 + q * 40), 1, look.ring), x, y)
  }
  ctx.globalAlpha = 1
  if (k <= 0) return
  const s = sprites(ENEMIES[d.legend].dex, arena.shiny)
  const body = s.bodyH
  if (def.entrance === 'rise') {
    const lift = Math.round((1 - k) * (body + 8))
    ctx.save()
    ctx.beginPath()
    ctx.rect(x - 200, y - 400, 400, 400 + 2)
    ctx.clip()
    drawPokemon(ctx, s, 'Idle', 0, t, x, y + lift, { tint: { color: look.tint, amount: 0.5 * (1 - k) } })
    ctx.restore()
    // Spray (or embers) off its back as it breaks the surface.
    ctx.fillStyle = look.spray
    for (let i = 0; i < 16; i++) {
      const a = hash2(i, 1, 3) * TAU
      const r = (t * 60 + hash2(i, 2, 3) * 40) % 40
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - Math.abs(Math.sin(a)) * r * 0.6), 1, 1)
    }
  } else if (def.entrance === 'descend') {
    blitCentered(ctx, ellipse(Math.round(6 + k * 14), Math.round(3 + k * 6), 'rgba(16,8,32,0.45)'), x, y)
    drawPokemon(ctx, s, 'Idle', 0, t, x, y - Math.round((1 - k) * 220))
  } else {
    drawPokemon(ctx, s, 'Idle', 0, t, x, y, { alpha: k, flash: 1 - k })
  }
}
