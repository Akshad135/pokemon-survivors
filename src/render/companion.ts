import { dir8, type Dir8 } from '../engine/math'
import { drawPokemon, sprites } from './sprites'

/**
 * The supporter's companion (`game/supporters.ts`): a Pokémon that trots
 * after the player. It lives only here, in the presentation: the simulation
 * never sees it, so it can't touch a run or its replay.
 */
export type CompanionView = { dex: number; shiny: boolean; x: number; y: number; dir: Dir8; walk: number; moving: boolean }

/** How far behind it keeps, how fast it closes the gap, and past what distance it just appears there (a rift's arena). */
const FOLLOW = { gap: 22, catchUp: 5, minSpeed: 40, teleport: 220 } as const

/** A companion standing just behind (south of) `at`. */
export const createCompanion = (dex: number, shiny: boolean, at: { x: number; y: number }): CompanionView => ({
  dex,
  shiny,
  x: at.x,
  y: at.y + FOLLOW.gap,
  dir: 0,
  walk: 0,
  moving: false,
})

/** Moves the companion towards `target` (the player) by `dt` seconds, keeping its gap. */
export const stepCompanion = (c: CompanionView, target: { x: number; y: number }, dt: number) => {
  const dx = target.x - c.x
  const dy = target.y - c.y
  const dist = Math.hypot(dx, dy)
  if (dist > FOLLOW.teleport) return Object.assign(c, createCompanion(c.dex, c.shiny, target))
  c.moving = dist > FOLLOW.gap
  if (!c.moving) return c
  const speed = Math.max(FOLLOW.minSpeed, (dist - FOLLOW.gap) * FOLLOW.catchUp)
  const step = Math.min(dist - FOLLOW.gap, speed * dt)
  c.x += (dx / dist) * step
  c.y += (dy / dist) * step
  c.dir = dir8(dx, dy)
  c.walk += dt
  return c
}

/** Draws the companion at its feet, walking or idle. */
export const drawCompanion = (ctx: CanvasRenderingContext2D, c: CompanionView, t: number) =>
  drawPokemon(ctx, sprites(c.dex, c.shiny), c.moving ? 'Walk' : 'Idle', c.dir, c.moving ? c.walk : t, c.x, c.y)
