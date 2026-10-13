import { clamp, dir8, retain, type Dir8, type Vec } from '../engine/math'
import { chance, createRng, pick, range, type Rng } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { STARTER_IDS, starterDex } from '../data/starters'
import { drawSparkles, shadow } from './draw'
import { drawPokemon, hasShiny, loadedSprites, loadSpecies, type Dex } from './sprites'
import { drawGround } from './world'

/**
 * Attract-mode backdrop behind the menus: the meadow under a slowly drifting
 * camera, with wild Pokémon strolling around (and, rarely, a shiny).
 * Pure presentation: it only reads sprites that are already loaded.
 */

type Wanderer = {
  dex: Dex
  shiny: boolean
  x: number
  y: number
  vx: number
  vy: number
  dir: Dir8
  /** Seconds left in the current stroll or rest. */
  timer: number
  /** Animation offset, so neighbours don't step in lockstep. */
  phase: number
  bornAt: number
  id: number
}

export type TitleScene = {
  rng: Rng
  time: number
  cam: Vec
  wanderers: Wanderer[]
  nextSpawn: number
  /** Species whose shiny form is loading for the next shiny roll. */
  nextShiny: Dex | null
  spawned: number
}

/** Every species that may roam: wild Pokémon and the starter lines (evolutions show up once a run has loaded them). */
const POOL: readonly Dex[] = [
  ...Object.values(ENEMIES).flatMap((e) => ('boss' in e ? [] : [e.dex])),
  ...STARTER_IDS.flatMap(starterDex),
]

const CAMERA_SPEED = 9
/** Off-screen band (world px) where wanderers enter; past it they're recycled. */
const MARGIN = 40
/** How far outside the view (world px) newcomers appear. */
const ENTRY = 16
const SHINY_CHANCE = 1 / 40
/** While the scene is this young, newcomers fade in on screen instead of walking in from an edge. */
const FILL_TIME = 3
const FADE_IN = 0.6
const SPEED = { min: 12, max: 22 }

/** One wanderer per this many square world px, so phones get a smaller crowd. */
const population = (w: number, h: number) => clamp(Math.round((w * h) / 9000), 5, 18)

export const createTitleScene = (seed: number): TitleScene => {
  const rng = createRng(seed)
  // Every visit starts somewhere else in the infinite meadow.
  return { rng, time: 0, cam: { x: Math.floor(rng() * 8192), y: Math.floor(rng() * 8192) }, wanderers: [], nextSpawn: 0, nextShiny: null, spawned: 0 }
}

/** Starts a stroll along one of the 8 sprite directions (towards `target` if given) or a short rest. */
const nextLeg = (rng: Rng, w: Wanderer, target?: Vec) => {
  if (!target && chance(rng, 0.35)) {
    w.vx = 0
    w.vy = 0
    w.timer = range(rng, 1, 3)
    return
  }
  const angle = target ? Math.atan2(target.y - w.y, target.x - w.x) : rng() * Math.PI * 2
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
  const speed = range(rng, SPEED.min, SPEED.max)
  w.vx = Math.cos(snapped) * speed
  w.vy = Math.sin(snapped) * speed
  w.dir = dir8(w.vx, w.vy)
  w.timer = range(rng, 2, 5)
}

/** Loaded species to pick from, plus a shiny form warmed up in the background for the next shiny roll. */
const pickSpecies = (s: TitleScene) => {
  const ready = POOL.filter((dex) => loadedSprites(dex))
  if (ready.length === 0) return null
  if (s.nextShiny === null) {
    const candidates = ready.filter(hasShiny)
    if (candidates.length > 0) {
      s.nextShiny = pick(s.rng, candidates)
      void loadSpecies(s.nextShiny, true).catch(() => {})
    }
  }
  if (s.nextShiny !== null && loadedSprites(s.nextShiny, true) && chance(s.rng, SHINY_CHANCE)) {
    const dex = s.nextShiny
    s.nextShiny = null
    return { dex, shiny: true }
  }
  return { dex: pick(s.rng, ready), shiny: false }
}

const spawn = (s: TitleScene, w: number, h: number) => {
  const species = pickSpecies(s)
  if (!species) return
  const { rng, cam } = s
  const inside = { x: cam.x + range(rng, 0.15, 0.85) * w, y: cam.y + range(rng, 0.15, 0.85) * h }
  const wanderer: Wanderer = { ...species, x: inside.x, y: inside.y, vx: 0, vy: 0, dir: 0, timer: 0, phase: rng() * 10, bornAt: s.time, id: s.spawned++ }
  if (s.time < FILL_TIME) {
    wanderer.dir = pick(rng, [0, 1, 2, 6, 7] as const)
    nextLeg(rng, wanderer)
  } else {
    // Enter from an edge, mostly the one the camera drifts towards, heading into the view.
    const side = rng()
    const along = { x: cam.x + rng() * w, y: cam.y + rng() * h }
    const at =
      side < 0.5 ? { x: cam.x + w + ENTRY, y: along.y }
      : side < 0.7 ? { x: along.x, y: cam.y - ENTRY }
      : side < 0.9 ? { x: along.x, y: cam.y + h + ENTRY }
      : { x: cam.x - ENTRY, y: along.y }
    wanderer.x = at.x
    wanderer.y = at.y
    nextLeg(rng, wanderer, inside)
  }
  s.wanderers.push(wanderer)
}

/** Advances the camera and every wanderer by `dt` seconds for a `w`×`h` view. */
export const stepTitleScene = (s: TitleScene, dt: number, w: number, h: number) => {
  s.time += dt
  s.cam.x += CAMERA_SPEED * dt
  s.cam.y += Math.sin(s.time * 0.11) * 4 * dt
  const { cam, rng } = s
  for (const wd of s.wanderers) {
    wd.x += wd.vx * dt
    wd.y += wd.vy * dt
    wd.timer -= dt
    if (wd.timer <= 0) nextLeg(rng, wd)
  }
  retain(s.wanderers, (wd) => wd.x > cam.x - MARGIN && wd.x < cam.x + w + MARGIN && wd.y > cam.y - MARGIN && wd.y < cam.y + h + MARGIN)
  if (s.wanderers.length < population(w, h) && s.time >= s.nextSpawn) {
    spawn(s, w, h)
    s.nextSpawn = s.time + (s.time < FILL_TIME ? 0.08 : range(rng, 0.4, 1.4))
  }
}

/** Draws the meadow and its wanderers, back to front, snapped to the world pixel grid. */
export const drawTitleScene = (ctx: CanvasRenderingContext2D, s: TitleScene, w: number, h: number) => {
  const camX = Math.round(s.cam.x)
  const camY = Math.round(s.cam.y)
  drawGround(ctx, camX, camY, w, h)
  s.wanderers.sort((a, b) => a.y - b.y)
  for (const wd of s.wanderers) {
    const sprite = loadedSprites(wd.dex, wd.shiny)
    if (!sprite) continue
    const x = Math.round(wd.x) - camX
    const y = Math.round(wd.y) - camY
    const alpha = Math.min(1, (s.time - wd.bornAt) / FADE_IN)
    shadow(ctx, x, y, sprite.bodyW)
    drawPokemon(ctx, sprite, wd.vx === 0 && wd.vy === 0 ? 'Idle' : 'Walk', wd.dir, s.time + wd.phase, x, y, { alpha })
    if (wd.shiny) drawSparkles(ctx, x, y - sprite.bodyH / 2, Math.max(sprite.bodyW, sprite.bodyH), s.time - wd.bornAt, wd.id)
  }
}
