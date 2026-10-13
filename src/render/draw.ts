import { blitCentered, blitRotated, ellipse, ring, textSprite } from '../engine/pixelart'
import { TAU } from '../engine/math'
import { ENEMIES } from '../data/enemies'
import { EVOLUTION_TIME, playerDex } from '../game/game'
import { xpTier } from '../game/pickups'
import type { Attack, Enemy, Game } from '../game/types'
import { FX, PICKUPS } from './art'
import { drawPokemon, sprites, type AnimName } from './sprites'
import { drawGround } from './world'

type Ctx = CanvasRenderingContext2D

const shadow = (ctx: Ctx, x: number, y: number, width: number) => {
  const rx = Math.max(3, Math.round(width * 0.36))
  blitCentered(ctx, ellipse(rx, Math.max(1, Math.round(rx * 0.4)), 'rgba(16,40,16,0.28)'), x, y)
}

/* ---------------- Attacks ---------------- */

/** Pixel-plotted circle outline with gaps – cheap "swirl" rings. */
const dashedRing = (ctx: Ctx, x: number, y: number, r: number, rot: number, colors: readonly string[], density = 0.5) => {
  const steps = Math.max(12, Math.floor(r * TAU * 0.6))
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU
    if (Math.sin(a * 3 + rot) < 1 - density * 2) continue
    ctx.fillStyle = colors[i % colors.length]!
    ctx.fillRect(Math.round(x + Math.cos(a + rot * 0.3) * r), Math.round(y + Math.sin(a + rot * 0.3) * r), 1, 1)
  }
}

const drawGroundAttack = (ctx: Ctx, a: Attack, t: number) => {
  if (a.shape.kind !== 'circle') return
  const r = a.shape.r
  switch (a.visual) {
    case 'whirlpool': {
      blitCentered(ctx, ellipse(Math.round(r), Math.round(r), 'rgba(80,140,240,0.16)'), a.x, a.y - 4)
      dashedRing(ctx, a.x, a.y - 4, r, t * 5, ['#a8d0f8', '#ffffff', '#6890f0'], 0.45)
      dashedRing(ctx, a.x, a.y - 4, r * 0.68, -t * 7, ['#6890f0', '#a8d0f8'], 0.35)
      dashedRing(ctx, a.x, a.y - 4, r * 0.38, t * 9, ['#ffffff'], 0.3)
      return
    }
    case 'sludge': {
      if (a.age < a.activeFrom) return
      const fade = Math.min(1, (a.ttl - a.age) / 0.3)
      const grow = Math.min(1, (a.age - a.activeFrom) / 0.12)
      ctx.globalAlpha = fade
      blitCentered(ctx, ellipse(Math.round(r * grow), Math.round(r * 0.72 * grow), 'rgba(96,32,112,0.55)'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(r * 0.7 * grow), Math.round(r * 0.48 * grow), 'rgba(176,80,184,0.55)'), a.x, a.y - 1)
      ctx.globalAlpha = 1
      return
    }
    case 'thunder': {
      if (a.age < a.activeFrom && Math.floor(a.age * 30) % 2 === 0) blitCentered(ctx, ring(Math.round(r), 1, '#f8e030'), a.x, a.y)
      return
    }
    case 'quake': {
      ctx.globalAlpha = Math.max(0, 1 - a.age / a.ttl)
      dashedRing(ctx, a.x, a.y, r, 0, ['#704820', '#a07840', '#e0c068'], 0.85)
      dashedRing(ctx, a.x, a.y, r - 2, 1.3, ['#503010', '#906838'], 0.5)
      ctx.fillStyle = '#503010'
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * TAU + a.id
        for (let d = 4; d < r - 3; d += 1.5) {
          const jag = Math.sin(d * 0.7 + i) * 1.5
          ctx.fillRect(Math.round(a.x + Math.cos(angle) * d - Math.sin(angle) * jag), Math.round(a.y + Math.sin(angle) * d + Math.cos(angle) * jag), 1, 1)
        }
      }
      ctx.globalAlpha = 1
      return
    }
    case 'roots': {
      ctx.globalAlpha = Math.max(0, 1 - a.age / a.ttl)
      dashedRing(ctx, a.x, a.y - 4, r, a.age * 4, ['#78c850', '#a87840', '#58a838'], 0.75)
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * TAU + a.id
        const x = Math.round(a.x + Math.cos(angle) * r)
        const y = Math.round(a.y - 4 + Math.sin(angle) * r)
        ctx.fillStyle = '#5a3818'
        ctx.fillRect(x, y - 3, 1, 4)
        ctx.fillStyle = '#78c850'
        ctx.fillRect(x - 1, y - 4, 3, 1)
      }
      ctx.globalAlpha = 1
      return
    }
  }
}

/** Small 8-ray impact spark (punch / bite hits). */
const spark = (ctx: Ctx, x: number, y: number, size: number) => {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU
    const len = i % 2 === 0 ? size : size * 0.6
    for (let d = 2; d <= len; d++) {
      ctx.fillStyle = d === 2 ? '#ffffff' : '#f8e070'
      ctx.fillRect(Math.round(x + Math.cos(angle) * d), Math.round(y + Math.sin(angle) * d), 1, 1)
    }
  }
}

/** Crescent slash arc, revealed by `sweep` (0..1). */
const slashArc = (ctx: Ctx, x: number, y: number, r: number, dir: number, sweep: number) => {
  const steps = Math.ceil(r * 2.6)
  const colors = ['#ffffff', '#a8d8f8', '#4878c0']
  for (let i = 0; i <= steps * sweep; i++) {
    const angle = dir - 1.1 + (2.2 * i) / steps
    const thick = Math.sin((i / steps) * Math.PI) * 3
    for (let k = 0; k < thick; k++) {
      ctx.fillStyle = colors[k]!
      ctx.fillRect(Math.round(x + Math.cos(angle) * (r - k)), Math.round(y + Math.sin(angle) * (r - k)), 1, 1)
    }
  }
}

const bolt = (ctx: Ctx, x: number, y: number, height: number) => {
  let cx = x
  for (let yy = y - height; yy < y; yy += 6) {
    const nx = yy + 6 >= y ? x : x + (Math.random() - 0.5) * 14
    const steps = 6
    for (let s = 0; s < steps; s++) {
      const px = Math.round(cx + ((nx - cx) * s) / steps)
      ctx.fillStyle = '#f8d030'
      ctx.fillRect(px - 1, yy + s, 3, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(px, yy + s, 1, 1)
    }
    cx = nx
  }
}

const drawAttack = (ctx: Ctx, a: Attack, t: number) => {
  const m = a.motion
  switch (a.visual) {
    case 'ember':
      return blitCentered(ctx, FX.ember()[Math.floor(t * 12) % 2]!, a.x, a.y)
    case 'flame':
      return blitCentered(ctx, FX.flame()[Math.floor((t + a.id) * 10) % 2]!, a.x, a.y - 2)
    case 'water': {
      const angle = m.kind === 'linear' ? Math.atan2(m.vy, m.vx) : 0
      return blitRotated(ctx, FX.water(), a.x, a.y, angle)
    }
    case 'leaf': {
      const scale = a.shape.kind === 'circle' ? Math.max(1, Math.round(a.shape.r / 6)) : 1
      return blitRotated(ctx, FX.leaf(), a.x, a.y, a.age * 16, scale)
    }
    case 'star':
      return blitRotated(ctx, FX.star(), a.x, a.y, a.age * 9)
    case 'sludge': {
      if (a.age >= a.activeFrom) return
      const k = a.age / a.activeFrom
      const x = a.from.x + (a.x - a.from.x) * k
      const y = a.from.y + (a.y - a.from.y) * k - Math.sin(k * Math.PI) * 40
      blitCentered(ctx, ellipse(3, 3, '#502060'), x, y)
      return blitCentered(ctx, ellipse(2, 2, '#c060d0'), x - 1, y - 1)
    }
    case 'thunder': {
      if (a.age < a.activeFrom) return
      const fade = 1 - (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
      ctx.globalAlpha = Math.max(0, fade)
      bolt(ctx, a.x, a.y, 180)
      if (a.shape.kind === 'circle') blitCentered(ctx, ellipse(Math.round(a.shape.r), Math.round(a.shape.r * 0.5), 'rgba(255,248,160,0.7)'), a.x, a.y)
      ctx.globalAlpha = 1
      return
    }
    case 'gust': {
      if (a.shape.kind !== 'circle') return
      ctx.globalAlpha = 1 - a.age / a.ttl
      dashedRing(ctx, a.x, a.y, a.shape.r, a.age * 20, ['#ffffff', '#e0e8f8', '#c8d0e8'], 0.7)
      dashedRing(ctx, a.x, a.y, a.shape.r * 0.8, -a.age * 25, ['#ffffff'], 0.25)
      ctx.globalAlpha = 1
      return
    }
    case 'vine': {
      if (a.shape.kind !== 'rect') return
      const dir = a.flip ? -1 : 1
      const reach = a.shape.w * Math.min(1, a.age / 0.07)
      const startX = a.x - (dir * a.shape.w) / 2
      ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.08)
      for (let i = 0; i < reach; i++) {
        const x = Math.round(startX + dir * i)
        const y = Math.round(a.y + Math.sin(i * 0.25 - a.age * 40) * 2)
        ctx.fillStyle = '#204818'
        ctx.fillRect(x, y - 2, 1, 4)
        ctx.fillStyle = i % 9 < 2 ? '#a8e870' : '#58a838'
        ctx.fillRect(x, y - 1, 1, 2)
        if (i % 14 === 7) {
          ctx.fillStyle = '#78c850'
          ctx.fillRect(x, y - 4, 2, 2)
        }
      }
      ctx.globalAlpha = 1
      return
    }
    case 'fist': {
      if (m.kind !== 'follow') return
      const angle = Math.atan2(m.oy + 8, m.ox)
      blitRotated(ctx, FX.fist(), a.x, a.y, angle)
      if (a.age > a.ttl * 0.5) spark(ctx, a.x + Math.cos(angle) * 6, a.y + Math.sin(angle) * 6, 5)
      return
    }
    case 'steel': {
      const r = a.shape.kind === 'circle' ? a.shape.r : 8
      blitRotated(ctx, FX.steel(), a.x, a.y, 0, Math.max(1, Math.round(r / 4)))
      if (Math.floor((t + a.id) * 12) % 3 === 0) spark(ctx, a.x, a.y, Math.round(r * 0.8))
      return
    }
    case 'arrow':
      return blitRotated(ctx, FX.arrow(), a.x, a.y, m.kind === 'linear' ? Math.atan2(m.vy, m.vx) : 0)
    case 'shuriken':
      return blitRotated(ctx, FX.shuriken(), a.x, a.y, a.age * 22)
    case 'jaws': {
      const r = a.shape.kind === 'circle' ? a.shape.r : 10
      const scale = Math.max(1, Math.round(r / 7))
      const { top, bottom } = FX.jaws()
      const gap = Math.round((1 - Math.min(1, a.age / a.activeFrom)) * r * 0.9)
      const half = (top.height * scale) / 2
      ctx.globalAlpha = a.age > a.activeUntil ? Math.max(0, 1 - (a.age - a.activeUntil) / (a.ttl - a.activeUntil)) : 1
      blitRotated(ctx, top, a.x, a.y - gap - half, 0, scale)
      blitRotated(ctx, bottom, a.x, a.y + gap + half, 0, scale)
      if (a.age >= a.activeFrom) spark(ctx, a.x, a.y, Math.round(r * 0.9))
      ctx.globalAlpha = 1
      return
    }
    case 'pyro': {
      if (a.age < a.activeFrom) {
        const k = a.age / a.activeFrom
        const x = a.from.x + (a.x - a.from.x) * k
        const y = a.from.y + (a.y - a.from.y) * k - Math.sin(k * Math.PI) * 50
        return blitRotated(ctx, FX.pyro(), x, y, a.age * 14)
      }
      if (a.shape.kind !== 'circle') return
      const e = (a.age - a.activeFrom) / (a.ttl - a.activeFrom)
      const r = Math.round(a.shape.r * (0.5 + 0.5 * e))
      ctx.globalAlpha = Math.max(0, 1 - e)
      blitCentered(ctx, ellipse(r, Math.round(r * 0.75), 'rgba(240,112,32,0.6)'), a.x, a.y)
      blitCentered(ctx, ellipse(Math.round(r * 0.55), Math.round(r * 0.4), '#f8d860'), a.x, a.y - 1)
      blitCentered(ctx, ring(r, 1, '#fff0a0'), a.x, a.y)
      ctx.globalAlpha = 1
      return
    }
    case 'psy': {
      const r = a.shape.kind === 'circle' ? a.shape.r : 6
      return blitRotated(ctx, FX.psy()[Math.floor((t + a.id) * 10) % 2]!, a.x, a.y, 0, Math.max(1, Math.round((r * 2) / 7)))
    }
    case 'heart':
      return blitCentered(ctx, FX.heart(), a.x, a.y + Math.round(Math.sin(a.age * 14) * 1.5))
    case 'note':
      return blitCentered(ctx, FX.note(), a.x + Math.round(Math.sin(a.age * 12) * 2), a.y)
    case 'blade': {
      if (m.kind !== 'orbit') return
      const r = a.shape.kind === 'circle' ? a.shape.r : 9
      return blitRotated(ctx, FX.blade(), a.x, a.y, m.angle + Math.PI * 0.75, Math.max(1, Math.round(r / 5)))
    }
    case 'shell': {
      if (m.kind !== 'follow' || a.shape.kind !== 'circle') return
      const dir = Math.atan2(m.oy + 8, m.ox)
      ctx.globalAlpha = Math.min(1, (a.ttl - a.age) / 0.08)
      slashArc(ctx, a.x - Math.cos(dir) * a.shape.r * 0.5, a.y - Math.sin(dir) * a.shape.r * 0.5, a.shape.r * 1.2, dir, Math.min(1, a.age / 0.1))
      ctx.globalAlpha = 1
      return
    }
    case 'whirlpool':
    case 'quake':
    case 'roots':
      return
  }
}

/* ---------------- Entities ---------------- */

const enemyAnim = (e: Enemy): AnimName => (e.dying >= 0 || e.flash > 0 ? 'Hurt' : 'Walk')

const drawEnemy = (ctx: Ctx, e: Enemy) => {
  const s = sprites(ENEMIES[e.kind].dex)
  if (e.dying >= 0) {
    const k = e.dying / 0.4
    drawPokemon(ctx, s, 'Hurt', e.dir, e.dying, e.x, e.y, { alpha: 1 - k, flash: 0.6 + k * 0.4, loop: false })
    return
  }
  drawPokemon(ctx, s, enemyAnim(e), e.dir, e.animTime, e.x, e.y, { flash: e.flash > 0.08 ? 0.85 : 0 })
}

const hpColor = (ratio: number) => (ratio > 0.5 ? '#48d048' : ratio > 0.2 ? '#f8c830' : '#f04030')

const drawPlayer = (ctx: Ctx, g: Game) => {
  const p = g.player
  const s = sprites(playerDex(g))
  const anim: AnimName = p.hurt > 0 ? 'Hurt' : p.moving ? 'Walk' : 'Idle'
  const blink = p.iframes > 0 && Math.floor(p.iframes * 20) % 2 === 0
  drawPokemon(ctx, s, anim, p.dir, p.animTime, p.x, p.y, { alpha: blink ? 0.45 : 1, flash: p.hurt > 0.2 ? 0.7 : 0 })

  // GBA-style HP bar under the feet.
  const w = 22
  const x = Math.round(p.x - w / 2)
  const y = Math.round(p.y + 4)
  ctx.fillStyle = '#181818'
  ctx.fillRect(x - 1, y - 1, w + 2, 4)
  ctx.fillStyle = '#504848'
  ctx.fillRect(x, y, w, 2)
  const ratio = p.hp / p.stats.maxHp
  ctx.fillStyle = hpColor(ratio)
  ctx.fillRect(x, y, Math.ceil(w * ratio), 2)
}

const drawPickups = (ctx: Ctx, g: Game, t: number) => {
  const candies = PICKUPS.candy()
  for (const k of g.pickups) {
    const bob = k.attracted ? 0 : Math.round(Math.sin(t * 4 + k.id) * 1.2)
    const sprite = k.kind === 'xp' ? candies[xpTier(k.value)]! : k.kind === 'berry' ? PICKUPS.berry() : PICKUPS.pokeball()
    if (!k.attracted) blitCentered(ctx, ellipse(3, 1, 'rgba(16,40,16,0.25)'), k.x, k.y + 4)
    blitCentered(ctx, sprite, k.x, k.y + bob)
  }
}

/* ---------------- Evolution scene ---------------- */

const drawEvolution = (ctx: Ctx, g: Game, t: number) => {
  const evo = g.evolution
  if (!evo) return
  const { w, h } = g.view
  const k = evo.t
  ctx.fillStyle = `rgba(8,8,24,${Math.min(0.85, k * 1.5)})`
  ctx.fillRect(0, 0, w, h)

  const cx = Math.round(w / 2)
  const cy = Math.round(h / 2 + 24)
  const from = sprites(evo.from)
  const to = sprites(evo.to)
  const flashStart = 0.7
  const flashEnd = 3.7
  if (k < flashStart) {
    drawPokemon(ctx, from, 'Idle', 0, t, cx, cy, { scale: 2 })
  } else if (k < flashEnd) {
    // Alternating silhouettes that speed up, like the handheld games.
    const progress = (k - flashStart) / (flashEnd - flashStart)
    const period = 0.5 - progress * 0.44
    const showNew = Math.floor((k - flashStart) / period) % 2 === 1
    drawPokemon(ctx, showNew ? to : from, 'Idle', 0, t, cx, cy, { scale: 2, flash: 1 })
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + k * 2
      const r = 70 - progress * 40
      ctx.fillStyle = i % 2 ? '#ffffff' : '#a8d8f8'
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy - 30 + Math.sin(a) * r * 0.6), 2, 2)
    }
  } else {
    drawPokemon(ctx, to, 'Idle', 0, t, cx, cy, { scale: 2 })
    const white = 1 - (k - flashEnd) / 0.5
    if (white > 0) {
      ctx.fillStyle = `rgba(255,255,255,${white})`
      ctx.fillRect(0, 0, w, h)
    }
  }
  if (k > EVOLUTION_TIME - 0.2) {
    ctx.fillStyle = `rgba(255,255,255,${(k - EVOLUTION_TIME + 0.2) * 2})`
    ctx.fillRect(0, 0, w, h)
  }
}

/* ---------------- Frame ---------------- */

const drawables: Array<Enemy | 'player'> = []

export const render = (ctx: Ctx, g: Game, t: number) => {
  const { w, h } = g.view
  const shakeX = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake * 2) : 0
  const shakeY = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake * 2) : 0
  const camX = Math.round(g.camera.x) + shakeX
  const camY = Math.round(g.camera.y) + shakeY

  drawGround(ctx, camX, camY, w, h)
  ctx.save()
  ctx.translate(-camX, -camY)

  const visible = (x: number, y: number, m = 48) => x > camX - m && x < camX + w + m && y > camY - m && y < camY + h + m * 2

  for (const a of g.attacks) if (a.age >= 0) drawGroundAttack(ctx, a, t)
  drawPickups(ctx, g, t)

  drawables.length = 0
  for (const e of g.enemies) if (visible(e.x, e.y)) drawables.push(e)
  drawables.push('player')
  drawables.sort((a, b) => (a === 'player' ? g.player.y : a.y) - (b === 'player' ? g.player.y : b.y))

  for (const d of drawables) {
    if (d === 'player') shadow(ctx, g.player.x, g.player.y, sprites(playerDex(g)).bodyW)
    else if (d.dying < 0) shadow(ctx, d.x, d.y, d.radius * 3)
  }
  for (const d of drawables) {
    if (d === 'player') drawPlayer(ctx, g)
    else drawEnemy(ctx, d)
  }

  for (const a of g.attacks) if (a.age >= 0 && visible(a.x, a.y, 200)) drawAttack(ctx, a, t)

  for (const p of g.particles) {
    ctx.globalAlpha = Math.min(1, (1 - p.life / p.ttl) * 1.5)
    ctx.fillStyle = p.color
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
  }
  ctx.globalAlpha = 1

  for (const text of g.texts) {
    ctx.globalAlpha = Math.min(1, (0.7 - text.life) * 5)
    blitCentered(ctx, textSprite(text.text, text.color), text.x, text.y)
  }
  ctx.globalAlpha = 1
  ctx.restore()

  if (g.phase === 'evolving') drawEvolution(ctx, g, t)
}
