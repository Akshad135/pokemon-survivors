import { createRng, seedFrom } from '../engine/rng'
import { hasShinySprite } from '../data/bodies'
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies'
import { brasiliaDay, dayNumber, previousDay, type DayKey } from './day'
import type { Roster } from './roster'

/**
 * Surto do dia (mass outbreak): one wild species per Brasília day, the same
 * for everyone, that joins every stage of every run that day as its most
 * common Pokémon. Its shinies come with the crowd: each spawn rolls the
 * regular `SHINY_ODDS.enemy`, and measured on headless 15-min runs the
 * outbreak is about a quarter of the horde (~1,070 spawns), so about 2.4 of
 * them come shiny (1 to 3 in most runs), where any other species meets a
 * fraction of one. Odds per spawn above the regular ones would overshoot.
 * It's a run input (`ReplayStart.outbreak`): the server checks it against
 * the day the run started (`outbreakFits`). Pure.
 */

export const OUTBREAK = {
  /** Tier of the species that break out: basics, which hold up from the first minute to the last. */
  tier: 2,
} as const

/** Species that can break out: tier `OUTBREAK.tier`, no behavior trait (they'd crowd the screen) and a shiny sprite to show off. By dex number. */
export const OUTBREAK_SPECIES: readonly EnemyId[] = (Object.keys(ENEMIES) as EnemyId[])
  .filter((id) => {
    const def: EnemyDef = ENEMIES[id]
    return def.tier === OUTBREAK.tier && def.trait === undefined && def.boss !== true && hasShinySprite(def.dex)
  })
  .sort((a, b) => ENEMIES[a].dex - ENEMIES[b].dex)

/** A seeded shuffle of the outbreak species: one cycle of days gives each one its day. */
const cycleOrder = (cycle: number) => {
  const rng = createRng(seedFrom(`outbreak:${cycle}`))
  const order = [...OUTBREAK_SPECIES]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

/** The outbreak of a Brasília day. Days walk through seeded cycles of every species, so none repeats within a cycle. */
export const outbreakOf = (day: DayKey): EnemyId => {
  const n = dayNumber(day)
  const size = OUTBREAK_SPECIES.length
  return cycleOrder(Math.floor(n / size))[((n % size) + size) % size]!
}

/** Today's outbreak, for a run starting at `now`. */
export const outbreakAt = (now: Date) => outbreakOf(brasiliaDay(now))

/**
 * Whether a run that started at `startedAt` may have played `outbreak`: the
 * outbreak of that Brasília day, or of the day before (the menus picked it
 * just before midnight). None at all is no advantage, so it fits too.
 */
export const outbreakFits = (outbreak: EnemyId | null, startedAt: Date) => {
  if (outbreak === null) return true
  const day = brasiliaDay(startedAt)
  return outbreak === outbreakOf(day) || outbreak === outbreakOf(previousDay(day))
}

/**
 * The run's cast with the outbreak in every stage, weighing as much as the
 * stage's heaviest species, so it's the most common Pokémon of the run.
 * Done after the draw, so the rest of the cast is the same either way. It
 * never runs (a whole horde of runners would be no outbreak).
 */
export const withOutbreak = (roster: Roster, outbreak: EnemyId | null): Roster => {
  if (outbreak === null) return roster
  return {
    ...roster,
    stages: roster.stages.map((pool) => {
      const weight = Math.max(...pool.map(([, w]) => w))
      return [...pool.filter(([id]) => id !== outbreak), [outbreak, weight] as const]
    }),
    runners: roster.runners.map((id) => (id === outbreak ? null : id)),
  }
}
