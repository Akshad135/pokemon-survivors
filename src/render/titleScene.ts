import { clamp, dir8, retain, type Dir8, type Vec } from '../engine/math'
import { blitCentered, blitEllipse } from '../engine/pixelart'
import { chance, createRng, pick, range, weightedPick, type Rng } from '../engine/rng'
import { ENEMIES } from '../data/enemies'
import { STARTER_IDS, starterDex } from '../data/starters'
import { EMOTES, type Emote } from './art'
import { createCompanion, drawCompanion, stepCompanion, type CompanionView } from './companion'
import { drawSparkles, shadow } from './draw'
import { drawPokemon, hasShiny, loadedSprites, loadSpecies, type Dex } from './sprites'
import { drawGround } from './world'
import { drawMeadowJacks, drawMeadowNight } from './halloweenArt'

/**
 * Attract-mode backdrop behind the menus: the meadow under a slowly drifting
 * camera, with wild Pokémon strolling around (and, rarely, a shiny).
 * On the lobby the partner can hop off its stage and take a walk among them
 * (`meetPartner`, `steerPartner`): bumping into one makes it react, and some
 * tag along for a while. Pure presentation: it only reads sprites that are
 * already loaded, and the cries it wants played wait in `cries` for the shell.
 */

/** How a wild Pokémon answers the partner's hello, and the emote it pops. */
const REACTIONS = {
  /** Two happy hops. */
  hop: { emote: 'note', time: 1.2, weight: 4 },
  /** A hop, then it follows the partner around for a while. */
  love: { emote: 'heart', time: 0.9, weight: 3 },
  /** Startled: a jump, then it scurries away. */
  shy: { emote: 'bang', time: 1.5, weight: 1.5 },
  /** A twirl through every direction. */
  spin: { emote: 'sparkle', time: 1.1, weight: 2 },
} as const satisfies Record<string, { emote: Emote; time: number; weight: number }>

type Reaction = keyof typeof REACTIONS
const REACTION_WEIGHTS = Object.entries(REACTIONS).map(([kind, r]) => [kind as Reaction, r.weight] as const)

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
  /** Its answer to the partner's hello, while it plays (`t` seconds in). */
  greet: { kind: Reaction; t: number; from: Dir8 } | null
  /** Scene time until which it trails behind the partner (after a `love` greeting). */
  followUntil: number
  /** Scene time from which the partner can greet it again. */
  calmAt: number
}

/**
 * The lobby's partner. `home` while it stands on the stage (the lobby draws
 * it there, big), `out` once a key, the stick or a tap sends it into the
 * meadow, and `back` while it walks back to the stage after a rest.
 */
export type Partner = {
  dex: Dex
  shiny: boolean
  state: 'home' | 'out' | 'back'
  x: number
  y: number
  dir: Dir8
  moving: boolean
  /** Seconds since the last key, stick or tap. */
  idle: number
  /** Scene time of its last hop (off the stage, a hello). */
  hopAt: number
  /** This frame's keys or stick, length ≤ 1. */
  move: Vec
  /** Where a tap sent it, world px. */
  target: Vec | null
  /** Its feet on the stage, world px: the shell keeps it in sync with the layout. */
  home: Vec
  /** Recent spots it stepped on, oldest first, for its followers to step on. */
  trail: Vec[]
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
  partner: Partner | null
  /** The supporter's companion (`render/companion.ts`), trotting after the partner while it's out in the meadow. */
  companion: CompanionView | null
  /** Cries for the shell to play (a wild Pokémon answering a hello), drained every frame. */
  cries: Dex[]
  /** Scene time before which no other cry is queued, so a crowd doesn't shout at once. */
  quietUntil: number
  /** Dust where the partner landed, by scene time. */
  puffs: { x: number; y: number; at: number }[]
  /** The Noite das Bruxas (set by the shell): night falls, jack-o'-lanterns light the meadow and ghosts roam it. */
  haunted: boolean
}

/** Every species that may roam: wild Pokémon and the starter lines (evolutions show up once a run has loaded them). */
const POOL: readonly Dex[] = [
  ...Object.values(ENEMIES).flatMap((e) => ('boss' in e ? [] : [e.dex])),
  ...STARTER_IDS.flatMap(starterDex),
]

/** The ghosts among them, who take over the meadow on the Noite das Bruxas. */
const GHOSTS: readonly Dex[] = Object.values(ENEMIES).flatMap((e) => (!('boss' in e) && e.types.some((t) => t === 'ghost') ? [e.dex] : []))
/** Share of a haunted meadow's newcomers that are ghosts, when any is loaded. */
const HAUNTED_SHARE = 0.65

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

const PARTNER_SPEED = 60
/** After this many idle seconds in the meadow the partner walks back to its stage. */
const REST = 12
/** The camera follows the partner when it gets this close (a fraction of the view) to an edge. */
const FOLLOW_EDGE = 0.22
/** Feet this close (world px) say hello. */
const GREET_RANGE = 16
const GREET_COOLDOWN = 8
/** How long a `love` greeting tags along, and how many may at once. */
const FOLLOW_TIME = 10
const MAX_FOLLOWERS = 3
/** Trail points (one per `TRAIL_STEP` px walked) between two followers. */
const TRAIL_GAP = 6
const TRAIL_STEP = 3
const TRAIL_LENGTH = (MAX_FOLLOWERS + 1) * TRAIL_GAP
/** A wanderer this close to the partner in the meadow may stroll over to it. */
const CURIOUS_RANGE = 90
const HOP = { time: 0.3, height: 5 }
const PUFF_TIME = 0.35

/** One wanderer per this many square world px, so phones get a smaller crowd. */
const population = (w: number, h: number) => clamp(Math.round((w * h) / 9000), 5, 18)

export const createTitleScene = (seed: number): TitleScene => {
  const rng = createRng(seed)
  // Every visit starts somewhere else in the infinite meadow.
  return {
    rng,
    time: 0,
    cam: { x: Math.floor(rng() * 8192), y: Math.floor(rng() * 8192) },
    wanderers: [],
    nextSpawn: 0,
    nextShiny: null,
    spawned: 0,
    partner: null,
    companion: null,
    cries: [],
    quietUntil: 0,
    puffs: [],
    haunted: false,
  }
}

/** The lobby's partner takes its place on the stage, with the supporter's companion if one walks along (`null`: the lobby closed, both are gone). */
export const meetPartner = (s: TitleScene, partner: { dex: Dex; shiny: boolean } | null, companion: CompanionView | null = null) => {
  for (const wd of s.wanderers) wd.followUntil = 0
  s.companion = partner && companion
  s.partner = partner && {
    ...partner,
    state: 'home',
    x: 0,
    y: 0,
    dir: 0,
    moving: false,
    idle: 0,
    hopAt: -1,
    move: { x: 0, y: 0 },
    target: null,
    home: { x: 0, y: 0 },
    trail: [],
  }
}

/** This frame's orders for the partner: keys or stick (`move`), a tapped spot (world px) and where its stage is (world px). */
export const steerPartner = (s: TitleScene, move: Vec, tap: Vec | null, home: Vec) => {
  const p = s.partner
  if (!p) return
  p.move = move
  p.home = home
  if (tap) p.target = tap
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
  const ghosts = s.haunted ? ready.filter((dex) => GHOSTS.includes(dex)) : []
  return { dex: pick(s.rng, ghosts.length > 0 && chance(s.rng, HAUNTED_SHARE) ? ghosts : ready), shiny: false }
}

const spawn = (s: TitleScene, w: number, h: number) => {
  const species = pickSpecies(s)
  if (!species) return
  const { rng, cam } = s
  const inside = { x: cam.x + range(rng, 0.15, 0.85) * w, y: cam.y + range(rng, 0.15, 0.85) * h }
  const wanderer: Wanderer = {
    ...species,
    x: inside.x,
    y: inside.y,
    vx: 0,
    vy: 0,
    dir: 0,
    timer: 0,
    phase: rng() * 10,
    bornAt: s.time,
    id: s.spawned++,
    greet: null,
    followUntil: 0,
    calmAt: 0,
  }
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

/** Where `p` heads this frame (world px/s): the keys or stick, else a tapped spot, else its stage once it rests. */
const partnerVelocity = (p: Partner, dt: number): Vec => {
  if (p.move.x !== 0 || p.move.y !== 0) {
    p.target = null
    return { x: p.move.x * PARTNER_SPEED, y: p.move.y * PARTNER_SPEED }
  }
  const goal = p.state === 'back' ? p.home : p.target
  if (!goal) return { x: 0, y: 0 }
  const dx = goal.x - p.x
  const dy = goal.y - p.y
  const d = Math.hypot(dx, dy)
  if (d > PARTNER_SPEED * dt) return { x: (dx / d) * PARTNER_SPEED, y: (dy / d) * PARTNER_SPEED }
  p.x = goal.x
  p.y = goal.y
  p.target = null
  if (p.state === 'back') p.state = 'home'
  return { x: 0, y: 0 }
}

/** Walks the partner: off the stage on the first order, back to it after `REST` idle seconds, the camera keeping it in view. */
const stepPartner = (s: TitleScene, p: Partner, dt: number, w: number, h: number) => {
  const ordered = p.move.x !== 0 || p.move.y !== 0 || p.target !== null
  if (ordered) {
    p.idle = 0
    if (p.state === 'home') {
      p.x = p.home.x
      p.y = p.home.y
      p.hopAt = s.time
      p.trail.length = 0
      s.puffs.push({ x: p.x, y: p.y, at: s.time })
    }
    p.state = 'out'
  } else if ((p.idle += dt) > REST && p.state === 'out') {
    p.state = 'back'
  }
  if (p.state === 'home') {
    p.x = p.home.x
    p.y = p.home.y
    p.dir = 0
    p.moving = false
    return
  }
  const v = partnerVelocity(p, dt)
  p.moving = v.x !== 0 || v.y !== 0
  if (p.moving) {
    p.x += v.x * dt
    p.y += v.y * dt
    p.dir = dir8(v.x, v.y)
    const last = p.trail.at(-1)
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= TRAIL_STEP) {
      p.trail.push({ x: p.x, y: p.y })
      if (p.trail.length > TRAIL_LENGTH) p.trail.shift()
    }
  }
  // Out in the meadow, the camera eases along whenever the partner nears an edge (on its way back, the stage stays put).
  if (p.state === 'out') {
    const mx = w * FOLLOW_EDGE
    const my = h * FOLLOW_EDGE
    const want = { x: clamp(s.cam.x, p.x - w + mx, p.x - mx), y: clamp(s.cam.y, p.y - h + my, p.y - my) }
    const k = Math.min(1, dt * 6)
    s.cam.x += (want.x - s.cam.x) * k
    s.cam.y += (want.y - s.cam.y) * k
  }
}

const following = (s: TitleScene, wd: Wanderer) => s.time < wd.followUntil

/** The partner says hello to `wd`: it stops, turns to face it and answers (a cry, an emote and what its reaction does). */
const greet = (s: TitleScene, p: Partner, wd: Wanderer) => {
  const followers = s.wanderers.reduce((n, o) => n + (following(s, o) ? 1 : 0), 0)
  // Its own species always loves the partner.
  let kind: Reaction = wd.dex === p.dex ? 'love' : weightedPick(s.rng, REACTION_WEIGHTS)
  if (kind === 'love' && followers >= MAX_FOLLOWERS) kind = 'hop'
  const facing = dir8(p.x - wd.x, p.y - wd.y)
  wd.greet = { kind, t: 0, from: facing }
  wd.dir = facing
  wd.vx = 0
  wd.vy = 0
  wd.calmAt = s.time + GREET_COOLDOWN
  p.hopAt = s.time
  if (s.time >= s.quietUntil) {
    s.cries.push(wd.dex)
    s.quietUntil = s.time + 1.2
  }
}

/** Plays out `wd`'s greeting; when it ends, a `love` starts following and the rest go back to wandering. */
const react = (s: TitleScene, wd: Wanderer, dt: number) => {
  const g = wd.greet!
  g.t += dt
  const p = s.partner
  if (g.kind === 'spin') wd.dir = ((g.from + Math.floor(g.t / 0.07)) % 8) as Dir8
  if (g.kind === 'shy' && g.t > 0.45 && p) {
    // Scurries straight away from the partner.
    const d = Math.hypot(wd.x - p.x, wd.y - p.y) || 1
    wd.vx = ((wd.x - p.x) / d) * 48
    wd.vy = ((wd.y - p.y) / d) * 48
    wd.dir = dir8(wd.vx, wd.vy)
  }
  if (g.t < REACTIONS[g.kind].time) return
  if (g.kind === 'spin') wd.dir = g.from
  if (g.kind === 'love' && p) wd.followUntil = s.time + FOLLOW_TIME
  wd.greet = null
  wd.vx = 0
  wd.vy = 0
  wd.timer = g.kind === 'shy' || g.kind === 'love' ? 0 : range(s.rng, 0.6, 1.4)
}

/**
 * `wd`'s place in the partner's line: followers queue in the order they joined,
 * never by where they stand (the draw sorts `wanderers` by y every frame), so
 * two of them can't keep trading spots and walking into each other.
 */
const lineRank = (s: TitleScene, wd: Wanderer) =>
  s.wanderers.reduce(
    (n, o) => n + (following(s, o) && (o.followUntil < wd.followUntil || (o.followUntil === wd.followUntil && o.id < wd.id)) ? 1 : 0),
    0,
  )

/** Steps `wd` onto its spot in the partner's trail, `rank` places behind it; it waits where it is until the trail reaches that far. */
const tagAlong = (wd: Wanderer, p: Partner, rank: number) => {
  const spot = p.trail[p.trail.length - 1 - (rank + 1) * TRAIL_GAP]
  const dx = spot ? spot.x - wd.x : 0
  const dy = spot ? spot.y - wd.y : 0
  const d = Math.hypot(dx, dy)
  if (d < 2) {
    wd.vx = 0
    wd.vy = 0
  } else {
    const speed = Math.min(PARTNER_SPEED * 1.15, d * 5)
    wd.vx = (dx / d) * speed
    wd.vy = (dy / d) * speed
    wd.dir = dir8(dx, dy)
  }
}

/** Advances the camera, the partner and every wanderer by `dt` seconds for a `w`×`h` view. */
export const stepTitleScene = (s: TitleScene, dt: number, w: number, h: number) => {
  s.time += dt
  const p = s.partner
  // The camera drifts on its own unless the partner is out in the meadow.
  if (!p || p.state === 'home') {
    s.cam.x += CAMERA_SPEED * dt
    s.cam.y += Math.sin(s.time * 0.11) * 4 * dt
  }
  if (p) stepPartner(s, p, dt, w, h)
  // The companion waits behind the stage while the partner stands on it, and follows it out.
  const c = s.companion
  if (c && p && p.state === 'home') Object.assign(c, createCompanion(c.dex, c.shiny, p, c.sparkles))
  else if (c && p) stepCompanion(c, p, dt)
  const { cam, rng } = s
  const roaming = p && p.state !== 'home' ? p : null
  for (const wd of s.wanderers) {
    if (wd.greet) react(s, wd, dt)
    else if (following(s, wd) && p) tagAlong(wd, p, lineRank(s, wd))
    else if ((wd.timer -= dt) <= 0) {
      const curious = roaming && Math.hypot(roaming.x - wd.x, roaming.y - wd.y) < CURIOUS_RANGE && s.time >= wd.calmAt && chance(rng, 0.4)
      nextLeg(rng, wd, curious ? roaming : undefined)
    }
    wd.x += wd.vx * dt
    wd.y += wd.vy * dt
    if (roaming && !wd.greet && !following(s, wd) && s.time >= wd.calmAt && s.time - wd.bornAt > FADE_IN && Math.hypot(wd.x - roaming.x, wd.y - roaming.y) < GREET_RANGE) {
      greet(s, roaming, wd)
    }
  }
  retain(s.wanderers, (wd) => wd.x > cam.x - MARGIN && wd.x < cam.x + w + MARGIN && wd.y > cam.y - MARGIN && wd.y < cam.y + h + MARGIN)
  retain(s.puffs, (puff) => s.time - puff.at < PUFF_TIME)
  if (s.wanderers.length < population(w, h) && s.time >= s.nextSpawn) {
    spawn(s, w, h)
    s.nextSpawn = s.time + (s.time < FILL_TIME ? 0.08 : range(rng, 0.4, 1.4))
  }
}

/** Height (px) of a hop `since` seconds in, `count` hops long; 0 outside it. */
const hopHeight = (since: number, count = 1, height = HOP.height) =>
  since < 0 || since >= HOP.time * count ? 0 : Math.round(Math.sin((Math.PI * (since % HOP.time)) / HOP.time) * height)

/** How high a greeting lifts its wanderer right now. */
const greetHop = (g: NonNullable<Wanderer['greet']>) =>
  g.kind === 'hop' ? hopHeight(g.t, 2, 4) : g.kind === 'love' ? hopHeight(g.t, 1, 4) : g.kind === 'shy' ? hopHeight(g.t, 1, 6) : 0

const drawPuffs = (ctx: CanvasRenderingContext2D, s: TitleScene, camX: number, camY: number) => {
  for (const puff of s.puffs) {
    const k = (s.time - puff.at) / PUFF_TIME
    ctx.globalAlpha = 0.8 * (1 - k)
    for (const side of [-1, 1]) blitEllipse(ctx, 3, 2, '#f0f0e0', Math.round(puff.x - camX + side * (4 + k * 10)), Math.round(puff.y - camY - k * 3))
  }
  ctx.globalAlpha = 1
}

/** Draws the meadow, its wanderers and the partner (when out), back to front, snapped to the world pixel grid; emotes go on top. */
export const drawTitleScene = (ctx: CanvasRenderingContext2D, s: TitleScene, w: number, h: number) => {
  const camX = Math.round(s.cam.x)
  const camY = Math.round(s.cam.y)
  drawGround(ctx, camX, camY, w, h)
  if (s.haunted) drawMeadowJacks(ctx, camX, camY, w, h, s.time)
  drawPuffs(ctx, s, camX, camY)
  const p = s.partner?.state === 'home' ? null : s.partner
  const c = p && s.companion
  const drawPartner = () => {
    const sprite = p && loadedSprites(p.dex, p.shiny)
    if (!p || !sprite) return
    const x = Math.round(p.x) - camX
    const y = Math.round(p.y) - camY
    shadow(ctx, x, y, sprite.bodyW)
    drawPokemon(ctx, sprite, p.moving ? 'Walk' : 'Idle', p.dir, s.time, x, y - hopHeight(s.time - p.hopAt))
  }
  const drawFollower = () => {
    const sprite = c && loadedSprites(c.dex, c.shiny)
    if (!c || !sprite) return
    shadow(ctx, Math.round(c.x) - camX, Math.round(c.y) - camY, sprite.bodyW)
    ctx.save()
    ctx.translate(-camX, -camY)
    drawCompanion(ctx, c, s.time)
    ctx.restore()
  }
  // The partner and its companion, back to front, slot in among the wanderers by their feet.
  const pending = [...(p ? [{ y: p.y, draw: drawPartner }] : []), ...(c ? [{ y: c.y, draw: drawFollower }] : [])].sort((a, b) => a.y - b.y)
  s.wanderers.sort((a, b) => a.y - b.y)
  for (const wd of s.wanderers) {
    while (pending[0] && wd.y > pending[0].y) pending.shift()!.draw()
    const sprite = loadedSprites(wd.dex, wd.shiny)
    if (!sprite) continue
    const x = Math.round(wd.x) - camX
    const y = Math.round(wd.y) - camY
    const alpha = Math.min(1, (s.time - wd.bornAt) / FADE_IN)
    const lift = wd.greet ? greetHop(wd.greet) : 0
    shadow(ctx, x, y, sprite.bodyW)
    drawPokemon(ctx, sprite, wd.vx === 0 && wd.vy === 0 ? 'Idle' : 'Walk', wd.dir, s.time + wd.phase, x, y - lift, { alpha })
    if (wd.shiny) drawSparkles(ctx, x, y - sprite.bodyH / 2, Math.max(sprite.bodyW, sprite.bodyH), s.time - wd.bornAt, wd.id)
  }
  for (const rest of pending) rest.draw()
  if (s.haunted) drawMeadowNight(ctx, camX, camY, w, h, s.time)
  // Emotes over everyone's heads, bobbing a pixel.
  const bubbles = EMOTES()
  for (const wd of s.wanderers) {
    const sprite = wd.greet && loadedSprites(wd.dex, wd.shiny)
    if (!wd.greet || !sprite) continue
    const bob = Math.floor(wd.greet.t * 4) % 2
    const top = Math.round(wd.y) - camY - sprite.bodyH - greetHop(wd.greet)
    blitCentered(ctx, bubbles[REACTIONS[wd.greet.kind].emote], Math.round(wd.x) - camX, top - 8 - bob)
  }
}
