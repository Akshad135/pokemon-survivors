import { chance, hash2, range } from '../engine/rng'
import { HALLOWEEN } from '../data/halloween'
import { ENEMIES, type EnemyId } from '../data/enemies'
import { stageIndexAt } from '../data/waves'
import { brasiliaDay, dayNumber, previousDay, type DayKey } from './day'
import { burst } from './effects'
import { spawnEnemy } from './enemies'
import type { Gift, GiftContent } from './gifts'
import type { Save } from './meta'
import { isRecord, wholeNumber } from './parse'
import { isSupporter } from './supporters'
import type { Roster } from './roster'
import type { Enemy, Game } from './types'
import * as dm from '../engine/dmath'

/**
 * Noite das Bruxas (`data/halloween.ts`): the event's calendar, the haunted
 * run and the candy jar. A run started on an event day is haunted, a run
 * input like the outbreak (`ReplayStart.halloween`, checked by the server
 * with `halloweenFits`): a ghost joins each stage, Ghost-type foes carry
 * candies (`dropCandies`) and some breakables are jack-o'-lanterns
 * (`crackPumpkin`: a treat of candies, or a trick, a ring of ghosts). The
 * candies a run collects go into the save's jar (`HalloweenSave`), which
 * pays `HALLOWEEN_REWARDS` as Mystery Gifts opened from the lobby's gift
 * box (`halloweenGifts`). Pure.
 */

/* ---------------- Calendar ---------------- */

/** Whether `day` is one of the event's days. */
export const isHalloweenDay = (day: DayKey) => day >= HALLOWEEN.from && day <= HALLOWEEN.to

/** Whether a run starting at `now` is haunted. */
export const halloweenAt = (now: Date) => isHalloweenDay(brasiliaDay(now))

/** Days from `day` until the event starts: positive while the lobby counts down (from `HALLOWEEN.teaser`), else null. */
export const daysToHalloween = (day: DayKey) => (day >= HALLOWEEN.teaser && day < HALLOWEEN.from ? dayNumber(HALLOWEEN.from) - dayNumber(day) : null)

/** Days left in the event from `day` on, today included; null outside it. */
export const halloweenDaysLeft = (day: DayKey) => (isHalloweenDay(day) ? dayNumber(HALLOWEEN.to) - dayNumber(day) + 1 : null)

/** The event's outbreak of `day` (`HALLOWEEN.outbreaks`), or null to keep the drawn one. */
export const halloweenOutbreak = (day: DayKey): EnemyId | null => (HALLOWEEN.outbreaks as Readonly<Record<string, EnemyId>>)[day] ?? null

/** Every event day with its outbreak, in order: the event screen's calendar. */
export const HALLOWEEN_CALENDAR = Object.entries(HALLOWEEN.outbreaks).map(([day, outbreak]) => ({ day, outbreak }))

/**
 * Whether a run that started at `startedAt` may be haunted: an event day, or
 * the day after one (the menus planned it just before midnight). A run that
 * isn't haunted always fits.
 */
export const halloweenFits = (haunted: boolean, startedAt: Date) => {
  if (!haunted) return true
  const day = brasiliaDay(startedAt)
  return isHalloweenDay(day) || isHalloweenDay(previousDay(day))
}

/* ---------------- The haunted run ---------------- */

/** Odds of the haunt next to the stage's other species: as common as an average one. */
const hauntWeight = (pool: Roster['stages'][number]) => pool.reduce((sum, [, w]) => sum + w, 0) / Math.max(1, pool.length)

/** The cast with the stage's ghost (`HALLOWEEN.haunts`) in each stage. Done after the draw, so the rest of the cast stays the same. */
export const withHaunts = (roster: Roster, haunted: boolean): Roster => {
  if (!haunted) return roster
  return {
    ...roster,
    stages: roster.stages.map((pool, i) => {
      const haunt = HALLOWEEN.haunts[Math.min(i, HALLOWEEN.haunts.length - 1)]!
      return pool.some(([id]) => id === haunt) ? pool : [...pool, [haunt, hauntWeight(pool)] as const]
    }),
  }
}

/** The ghost haunting the stage at `time`. */
const stageHaunt = (time: number): EnemyId => HALLOWEEN.haunts[Math.min(stageIndexAt(time), HALLOWEEN.haunts.length - 1)]!

const isGhost = (e: Pick<Enemy, 'types'>) => e.types.includes('ghost')

/** How many candies a fainted foe carries: bosses and Alphas always, Ghost types now and then (more for elites and shinies). */
export const candiesOf = (rng: () => number, e: Pick<Enemy, 'types' | 'boss' | 'alpha' | 'elite' | 'shiny'>, share = 1) => {
  const c = HALLOWEEN.candy
  if (e.boss || e.alpha) return c.boss
  if (!isGhost(e)) return 0
  if (e.shiny) return c.shiny
  if (e.elite) return c.elite
  return chance(rng, c.ghost * share) ? 1 : 0
}

/** Scatters `count` candies around (x, y), like coins. */
export const dropCandies = (g: Game, x: number, y: number, count: number) => {
  const spread = count > 1 ? 36 : 12
  for (let i = 0; i < count; i++) {
    g.pickups.push({ id: g.nextId++, x, y, vx: range(g.rng, -spread, spread), vy: range(g.rng, -spread, -6), attracted: false, age: 0, kind: 'treat' })
  }
}

/** A haunted run's candies from a fainted foe (`killEnemy`). `share` is the pressure director's loot share (`tension.ts`). */
export const faintCandies = (g: Game, e: Enemy, share: number) => {
  if (!g.halloween) return
  const n = candiesOf(g.rng, e, share)
  if (n > 0) dropCandies(g, e.x, e.y - 2, n)
}

/** A candy picked up: into the run's jar. */
export const collectCandy = (g: Game) => {
  g.candies++
  g.events.push({ kind: 'treat' })
}

/** Whether a breakable in world cell (cx, cy) of a haunted run is a jack-o'-lantern. Pure, so the map looks the same when revisited. */
export const isPumpkinCell = (cx: number, cy: number) => hash2(cx, cy, 6613) < HALLOWEEN.pumpkin.share

const PUMPKIN_COLORS = ['#f88820', '#ffc040', '#583010', '#40a038'] as const
const TRICK_COLORS = ['#a058e0', '#e0c0ff', '#58f0b0', '#ffffff'] as const

/**
 * A jack-o'-lantern cracked open at (x, y): doces ou travessuras! Mostly a
 * treat, candies spilling out; else a trick, a ring of the stage's ghost
 * closing in on the player (and still one candy).
 */
export const crackPumpkin = (g: Game, x: number, y: number) => {
  const p = HALLOWEEN.pumpkin
  const treat = chance(g.rng, p.treat)
  const ghost = treat ? null : stageHaunt(g.time)
  burst(g, x, y - 6, { colors: PUMPKIN_COLORS, count: 22, speed: 100, ttl: 0.55, gravity: 90 })
  if (!ghost) {
    dropCandies(g, x, y - 4, p.treatCandies)
  } else {
    dropCandies(g, x, y - 4, p.trickCandies)
    const offset = range(g.rng, 0, Math.PI * 2)
    const { x: px, y: py } = g.player
    for (let i = 0; i < p.trickGhosts; i++) {
      const a = offset + (i / p.trickGhosts) * Math.PI * 2
      const gx = px + dm.cos(a) * p.trickRadius
      const gy = py + dm.sin(a) * p.trickRadius
      spawnEnemy(g, ghost, gx, gy)
      burst(g, gx, gy - 8, { colors: TRICK_COLORS, count: 8, speed: 50, ttl: 0.6, gravity: -40 })
    }
  }
  g.events.push({ kind: 'trickOrTreat', ghost })
}

/** Dex numbers of the event's ghosts, for the shell to warm up before the lobby's haunted meadow wants them. */
export const HAUNT_DEX = [...new Set(HALLOWEEN.haunts.map((id) => ENEMIES[id].dex))]

/* ---------------- The candy jar ---------------- */

/** The save's side of the event: every candy brought home from a haunted run. */
export type HalloweenSave = { candies: number }

export const NO_HALLOWEEN: HalloweenSave = { candies: 0 }

export const parseHalloween = (raw: unknown): HalloweenSave => ({ candies: wholeNumber(isRecord(raw) ? raw.candies : 0) })

/** Two devices' jars: the fuller one (candies brought home on both sides apart aren't added up, like the records). */
export const mergeHalloween = (a: HalloweenSave, b: HalloweenSave): HalloweenSave => ({ candies: Math.max(a.candies, b.candies) })

/** Banks a run's candies into the jar. */
export const addCandies = (save: Save, candies: number): Save => (candies > 0 ? { ...save, halloween: { candies: save.halloween.candies + candies } } : save)

/**
 * What the jar pays, in order: the Abóbora frame for showing up, then the
 * Noite das Bruxas background, a rare egg, the Casa Assombrada wallpaper,
 * the Rei das Abóboras title and a shiny Gastly.
 */
export const HALLOWEEN_REWARDS = [
  { candies: 0, content: { kind: 'style', style: { slot: 'frame', id: 'pumpkin' } } },
  { candies: 60, content: { kind: 'style', style: { slot: 'background', id: 'halloween' } } },
  { candies: 150, content: { kind: 'egg', tier: 'rare' } },
  { candies: 300, content: { kind: 'style', style: { slot: 'wallpaper', id: 'haunted' } } },
  { candies: 500, content: { kind: 'title', title: 'pumpkinKing' } },
  { candies: 800, content: { kind: 'shinyHatch', family: 'gastly' } },
] as const satisfies readonly { candies: number; content: GiftContent }[]

/** The Mystery Gift id of a reward: the save keeps it once applied, so each lands once (on any device). */
export const halloweenGiftId = (index: number) => `halloween2026:${index}`

/** Whether a gift is one of the jar's, made by the game rather than listed by the API. */
export const isHalloweenGift = (id: string) => id.startsWith('halloween2026:')

/** The supporters' gift: Pumpkaboo, a companion no one else gets (it leaves candy sparkles behind as it walks). */
export const PUMPKABOO_GIFT = { id: 'halloween2026:pumpkaboo', content: { kind: 'companion', id: 'pumpkaboo' }, reason: { kind: 'halloweenSupport' } } as const satisfies Gift

/**
 * The event's gifts waiting to be opened on `day`: every reward the jar's
 * candies reached that the save didn't apply yet (the frame for showing up
 * needs an event day, or a candy already in the jar), and Pumpkaboo for a
 * supporter on an event day.
 */
export const halloweenGifts = (save: Save, day: DayKey): Gift[] => [
  ...HALLOWEEN_REWARDS.flatMap((r, i) => {
    const id = halloweenGiftId(i)
    const reached = r.candies === 0 ? isHalloweenDay(day) || save.halloween.candies > 0 : save.halloween.candies >= r.candies
    return reached && !save.gifts.includes(id) ? [{ id, content: r.content, reason: { kind: 'halloween' } } satisfies Gift] : []
  }),
  ...(isSupporter(save) && isHalloweenDay(day) && !save.gifts.includes(PUMPKABOO_GIFT.id) ? [PUMPKABOO_GIFT] : []),
]

/** The next reward the jar fills toward, or null once every one is reached. */
export const nextHalloweenReward = (candies: number) => HALLOWEEN_REWARDS.find((r) => r.candies > candies) ?? null

/* ---------------- The supporters' jack-o'-lantern ---------------- */

/**
 * Whether a supporter since `since` (ISO, as the API sends it) wears the
 * Noite das Bruxas badge at `now`: a jack-o'-lantern with a heart carved in,
 * instead of the heart. Anyone who supported the game by the event's last
 * day, from its first day on and for good.
 */
export const pumpkinSupporter = (since: string | null | undefined, now: Date) => {
  const at = since ? Date.parse(since) : Number.NaN
  return Number.isFinite(at) && brasiliaDay(new Date(at)) <= HALLOWEEN.to && brasiliaDay(now) >= HALLOWEEN.from
}

/** Whether becoming a supporter on `day` still earns the jack-o'-lantern: the lobby offers it from the countdown to the event's last day. */
export const pumpkinOfferOpen = (day: DayKey) => day >= HALLOWEEN.teaser && day <= HALLOWEEN.to
