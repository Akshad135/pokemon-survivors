import { biomeAt, type BiomeId } from '../data/biomes'
import { weatherFits } from './weather'
import type { Game } from './types'

/**
 * Where the run is. `prev` and `since` let the renderer cross-dissolve the
 * ground; `scheduled` is the schedule's last pick, so a biome forced from the
 * dev console holds until the next scheduled change.
 */
export type BiomeState = { id: BiomeId; prev: BiomeId | null; since: number; scheduled: BiomeId }

export const createBiome = (): BiomeState => ({ id: biomeAt(0), prev: null, since: -Infinity, scheduled: biomeAt(0) })

/** Seconds after entering a biome before weather that doesn't belong there clears up (lets the banner breathe). */
const WEATHER_GRACE = 5

/** Moves the run to another biome now (also the dev console's `ps.biome`). */
export const setBiome = (g: Game, id: BiomeId) => {
  if (id === g.biome.id) return
  g.biome = { ...g.biome, id, prev: g.biome.id, since: g.time }
  g.events.push({ kind: 'biome', biome: id })
  // A move's call (Rain Dance, Sunny Day) holds its sky over any biome; what it held is checked when it ends.
  if (!g.weather.held && !weatherFits(id, g.weather.id)) g.weather.next = Math.min(g.weather.next, g.time + WEATHER_GRACE)
}

/** Follows the biome schedule as the run clock advances. */
export const updateBiome = (g: Game) => {
  const next = biomeAt(g.time)
  if (next === g.biome.scheduled) return
  g.biome.scheduled = next
  setBiome(g, next)
}
