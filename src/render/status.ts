import { blitCentered, context2d, createCanvas, type PixelSprite } from '../engine/pixelart'
import { mainStatus, STATUS_RULES, type EnemyStatus, type StatusKind } from '../game/status'

type Ctx = CanvasRenderingContext2D

const tint = { color: '', amount: 0 }

/** Pulsing/flickering color overlay for an afflicted enemy (reused object, read it right away). */
export const statusTint = (st: EnemyStatus, t: number, seed: number) => {
  const kind = mainStatus(st)
  if (!kind) return undefined
  tint.color = STATUS_RULES[kind].color
  switch (kind) {
    case 'paralysis': {
      const on = st.stun > 0 ? Math.floor(t * 20) % 2 === 0 : Math.floor(t * 8 + seed) % 4 === 0
      tint.amount = on ? 0.6 : 0.15
      break
    }
    case 'burn':
      tint.amount = 0.28 + Math.sin(t * 10 + seed) * 0.14
      break
    case 'poison':
      tint.amount = 0.32 + Math.sin(t * 5 + seed) * 0.1
      break
    case 'slow':
      tint.amount = 0.18
      break
    case 'sleep':
      tint.amount = 0.22 + Math.sin(t * 2 + seed) * 0.08
      break
  }
  return tint
}

/* ---------- GBA-style BRN/PSN/PAR/SLP badges ---------- */

const LETTERS: Record<string, readonly string[]> = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  L: ['100', '100', '100', '100', '111'],
  N: ['101', '111', '111', '111', '101'],
  P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
}

const BADGES = {
  burn: { text: 'BRN', bg: '#e07038' },
  poison: { text: 'PSN', bg: '#a050b0' },
  paralysis: { text: 'PAR', bg: '#c8a000' },
  sleep: { text: 'SLP', bg: '#6878a8' },
} as const

const badgeCache = new Map<StatusKind, PixelSprite>()

const buildBadge = ({ text, bg }: { text: string; bg: string }) => {
  const w = text.length * 4 + 3
  const canvas = createCanvas(w, 9)
  const ctx = context2d(canvas)
  ctx.fillStyle = '#181818'
  ctx.fillRect(1, 0, w - 2, 9)
  ctx.fillRect(0, 1, w, 7)
  ctx.fillStyle = bg
  ctx.fillRect(1, 1, w - 2, 7)
  ctx.fillStyle = '#ffffff'
  ;[...text].forEach((c, i) => {
    LETTERS[c]!.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '1') ctx.fillRect(2 + i * 4 + x, 2 + y, 1, 1)
    })
  })
  return canvas
}

/** Draws the status badge centered at (x, y). Slow has no badge. */
export const drawStatusBadge = (ctx: Ctx, st: EnemyStatus, x: number, y: number) => {
  const kind = mainStatus(st)
  if (!kind || kind === 'slow') return
  let sprite = badgeCache.get(kind)
  if (!sprite) badgeCache.set(kind, (sprite = buildBadge(BADGES[kind])))
  blitCentered(ctx, sprite, x, y)
}
