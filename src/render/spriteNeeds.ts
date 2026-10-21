import { partnerOf } from '../data/domains'
import { ENEMIES } from '../data/enemies'
import { GRAVEYARD } from '../data/places'
import { isSummoner, SUMMONS } from '../data/traits'
import { EVENTS, STAGES, stageIndexAt, stageStart } from '../data/waves'
import { ENDLESS, REAPER } from '../game/endless'
import { placePool } from '../game/place'
import { bossSummons, type Roster } from '../game/roster'
import type { Game } from '../game/types'
import type { Dex, KeepSprites } from './sprites'

/**
 * Which species' sheets a run holds: the shell streams the ones it needs now
 * and next (`streamSpecies`) and sweeps the rest (`sweepSprites`), so memory
 * stays flat over a run instead of growing with every species it met.
 * Presentation only: the simulation never reads any of it.
 */

/** A species a run may draw from `from` to `until` (run seconds). */
export type SpriteNeed = { dex: Dex; from: number; until: number }

/** Seconds an event's species stays wanted after it comes; the enemies it brought are kept while they live. */
const EVENT_TAIL = 30

/** Seconds ahead of the reaper's hunt its sheets start loading. */
const REAPER_LEAD = 60

const stageEnd = (i: number) => STAGES[i]?.until ?? Infinity

/**
 * Every species of a run's cast with the window it shows up in: each stage's
 * pool (and what its summoners call in) and its spitter while the stage lasts,
 * each event's species (swarm, ring, boss and who it summons) from its time. `extras` (the fleeing
 * Meowth, the escort's Togepi) are wanted from their time on.
 */
export const castNeeds = (roster: Roster, extras: readonly { dex: Dex; at: number }[] = []): SpriteNeed[] => [
  ...roster.stages.flatMap((pool, i) => {
    const spitter = roster.spitters[i]
    const ids = [...pool.flatMap(([id]) => [id, ...(isSummoner(id) ? SUMMONS[id] : [])]), ...(spitter ? [spitter] : [])]
    return ids.map((id) => ({ dex: ENEMIES[id].dex, from: stageStart(i), until: stageEnd(i) }))
  }),
  ...EVENTS.flatMap((e, i) => {
    const id = roster.events[i]
    return id ? [id, ...(e.kind === 'boss' ? bossSummons(id) : [])].map((need) => ({ dex: ENEMIES[need].dex, from: e.at, until: e.at + EVENT_TAIL })) : []
  }),
  ...extras.map(({ dex, at }) => ({ dex, from: at, until: Infinity })),
]

/** The needs due by the end of the stage after the one playing at `time` and not over yet, soonest first, each species once. */
export const dueNeeds = (needs: readonly SpriteNeed[], time: number): Dex[] => {
  const horizon = stageEnd(stageIndexAt(time) + 1)
  const due = needs.filter((n) => n.from <= horizon && n.until > time).sort((a, b) => a.from - b.from)
  return [...new Set(due.map((n) => n.dex))]
}

/** The rift's legendary (and its partner) from its omen to the end of its arena: shown in its forms, so every variant is kept. */
const riftLegends = (g: Game): Dex[] => {
  const legend = g.rift.omen?.legend ?? g.rift.portal?.legend ?? g.rift.arena?.legend
  const partner = legend && partnerOf(legend)
  return [...(legend ? [ENEMIES[legend].dex] : []), ...(partner ? [ENEMIES[partner].dex] : [])]
}

/** A place's dwellers (the ones its pool has now) once its entrance opens, Spiritomb with the graveyard's, and the reaper as its hunt nears in the endless mode. */
const visitors = (g: Game): Dex[] => {
  const place = g.place.inside?.id ?? g.place.entrance?.id
  return [
    ...(place ? placePool(place, g.time).map(([id]) => ENEMIES[id].dex) : []),
    ...(place === 'graveyard' ? [ENEMIES[GRAVEYARD.boss].dex] : []),
    ...(g.endless && g.time >= ENDLESS.reaperAt - REAPER_LEAD ? [ENEMIES[REAPER].dex] : []),
  ]
}

/**
 * What a run streams and keeps right now. It streams what the next moments
 * bring outside the cast (`riftLegends`, `visitors`), then this stage's and the
 * next one's cast by when they come. It keeps those, every enemy alive (on
 * screen or not), and with every variant (shiny, forms) `always` (the player's
 * line, the companion, the outbreak), the rift's legendary, shiny enemies and bosses.
 */
export const runSprites = (g: Game, needs: readonly SpriteNeed[], always: readonly Dex[]): { stream: Dex[]; keep: KeepSprites } => {
  const legends = riftLegends(g)
  const stream = [...new Set([...legends, ...visitors(g), ...dueNeeds(needs, g.time)])]
  const species = new Set(stream)
  const variants = new Set([...always, ...legends])
  for (const e of g.enemies) {
    const dex = ENEMIES[e.kind].dex
    species.add(dex)
    if (e.shiny || e.boss) variants.add(dex)
    // A boss outliving its event's window still calls in its summons.
    if (!e.boss) continue
    for (const id of bossSummons(e.kind)) {
      const called = ENEMIES[id].dex
      if (species.has(called)) continue
      species.add(called)
      stream.push(called)
    }
  }
  return { stream, keep: { species, variants } }
}
