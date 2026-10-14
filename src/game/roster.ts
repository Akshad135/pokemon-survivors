import { pick, weightedPick, type Rng } from '../engine/rng'
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies'
import type { Tier } from '../data/roster'
import type { PokeType } from '../data/types'
import { EVENTS, STAGES, stageIndexAt, stageStart, type WaveEvent, type WaveStage } from '../data/waves'

/** Weighted spawn pool of one stage, as `weightedPick` takes it. */
export type StagePool = ReadonlyArray<readonly [EnemyId, number]>

/** A run's cast, drawn once when the run starts. */
export type Roster = {
  /** One pool per `STAGES` entry. */
  stages: readonly StagePool[]
  /** Species of each swarm and ring, aligned with `EVENTS` (`null` for bosses, which name their own). */
  events: readonly (EnemyId | null)[]
}

/**
 * Optional draw bias, such as a biome's type affinity: relative odds of `def`
 * joining stage `stage` (index into `STAGES`). 1 = neutral, 0 = never (unless
 * nothing else of that tier is left).
 */
export type SpeciesWeight = (def: EnemyDef, stage: number) => number

export type RosterOptions = {
  weight?: SpeciesWeight
  stages?: readonly WaveStage[]
  events?: readonly WaveEvent[]
}

/** Spawn weight of a species new to the stage vs one kept from the previous stage. */
const FRESH = 4
const CARRIED = 3

type Entry = readonly [EnemyId, EnemyDef & { tier: Tier }]

/** Every species that can be drawn: anything in `ENEMIES` with a tier. */
const TIERED: readonly Entry[] = (Object.entries(ENEMIES) as Array<[EnemyId, EnemyDef]>).flatMap(([id, def]) =>
  def.tier === undefined ? [] : [[id, { ...def, tier: def.tier }] as const],
)

const TIER_OF = new Map(TIERED.map(([id, def]) => [id, def.tier]))

const isFlyer = (def: EnemyDef) => def.types.includes('flying')

/** Weighted pick of one entry; when every weight is 0 they all count the same. */
const drawOne = (rng: Rng, entries: readonly Entry[], weight: (def: EnemyDef) => number): EnemyId => {
  const weighted = entries.map(([id, def]) => [id, Math.max(0, weight(def))] as const)
  const total = weighted.reduce((sum, [, w]) => sum + w, 0)
  return weightedPick(rng, total > 0 ? weighted : weighted.map(([id]) => [id, 1] as const))
}

const firstNonEmpty = <T>(...lists: ReadonlyArray<readonly T[]>) => lists.find((l) => l.length > 0) ?? []

/**
 * Draws a run's cast from `rng`: each stage's slots are filled from their tier
 * (species new to the run first), keeping up to `cast.length - fresh` of the
 * previous stage's newest species. Swarms take a flyer of their tier the run
 * has already met (else any flyer of the tier, else the fastest met), rings a
 * species of their tier the run has already met. Same seed, same cast.
 */
export const drawRoster = (rng: Rng, { weight = () => 1, stages = STAGES, events = EVENTS }: RosterOptions = {}): Roster => {
  const used = new Set<EnemyId>()
  const ofTier = (tier: Tier) => {
    const all = TIERED.filter(([, def]) => def.tier === tier)
    return firstNonEmpty(
      all.filter(([id]) => !used.has(id)),
      all,
      TIERED.filter(([id]) => !used.has(id)),
    )
  }
  const draw = (entries: readonly Entry[], stage: number) => {
    const id = drawOne(rng, entries, (def) => weight(def, stage))
    used.add(id)
    return id
  }

  let previous: EnemyId[] = []
  const casts = stages.map((stage, i) => {
    const open: Tier[] = [...stage.cast]
    const carried: EnemyId[] = []
    for (const id of [...previous].reverse()) {
      if (carried.length >= stage.cast.length - stage.fresh) break
      const slot = open.indexOf(TIER_OF.get(id) ?? 1)
      if (slot < 0) continue
      open.splice(slot, 1)
      carried.unshift(id)
    }
    const fresh = open.map((tier) => draw(ofTier(tier), i))
    previous = [...carried, ...fresh]
    return { carried, fresh }
  })

  /** Species the run has met by stage `index`, by tier. */
  const metBy = (index: number, tier: Tier): Entry[] => {
    const ids = new Set(casts.slice(0, index + 1).flatMap((c) => [...c.carried, ...c.fresh]))
    return TIERED.filter(([id, def]) => ids.has(id) && def.tier === tier)
  }

  const eventSpecies = events.map((e): EnemyId | null => {
    if (e.kind === 'boss') return null
    if ('enemy' in e) return e.enemy
    const stage = stageIndexAt(e.at)
    const met = metBy(stage, e.tier)
    if (e.kind === 'ring') return met.length > 0 ? pick(rng, met)[0] : draw(ofTier(e.tier), stage)
    const flyers = met.filter(([, def]) => isFlyer(def))
    if (flyers.length > 0) return pick(rng, flyers)[0]
    const wildFlyers = ofTier(e.tier).filter(([, def]) => isFlyer(def))
    if (wildFlyers.length > 0) return draw(wildFlyers, stage)
    const fastest = [...met].sort((a, b) => b[1].speed - a[1].speed)[0]
    return fastest ? fastest[0] : draw(ofTier(e.tier), stage)
  })

  return {
    stages: casts.map(({ carried, fresh }) => [...carried.map((id) => [id, CARRIED] as const), ...fresh.map((id) => [id, FRESH] as const)]),
    events: eventSpecies,
  }
}

/**
 * Type affinity as a `SpeciesWeight`: a species takes the highest factor among
 * its types listed in `affinity`, or 1 when none is listed.
 * `byTypes({ rock: 3, ground: 3, water: 0.2 })` makes a cave full of Geodude.
 */
export const byTypes =
  (affinity: Partial<Record<PokeType, number>>): SpeciesWeight =>
  (def) => {
    const factors = def.types.flatMap((t) => (affinity[t] === undefined ? [] : [affinity[t]]))
    return factors.length > 0 ? Math.max(...factors) : 1
  }

/**
 * Every species a run needs (horde, swarms, rings, bosses) with the run time
 * it first shows up at, soonest first. The shell loads `at === 0` before the
 * run starts and streams the rest in this order.
 */
export const rosterSchedule = (roster: Roster, events: readonly WaveEvent[] = EVENTS) => {
  const needs = [
    ...roster.stages.flatMap((pool, i) => pool.map(([id]) => ({ id, at: stageStart(i) }))),
    ...events.flatMap((e, i) => {
      const id = e.kind === 'boss' ? e.enemy : roster.events[i]
      return id ? [{ id, at: e.at }] : []
    }),
  ].sort((a, b) => a.at - b.at)
  const seen = new Set<number>()
  return needs.flatMap(({ id, at }) => {
    const dex = ENEMIES[id].dex
    if (seen.has(dex)) return []
    seen.add(dex)
    return [{ dex, at }]
  })
}
