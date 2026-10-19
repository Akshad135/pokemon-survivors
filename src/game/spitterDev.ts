import { ENEMIES, type EnemyId } from '../data/enemies'
import { stageIndexAt } from '../data/waves'
import { spawnEnemy } from './enemies'
import { makeSpitter } from './spitters'
import type { Game } from './types'
import * as dm from '../engine/dmath'

/**
 * Dev-console helper for spitters, wired in `main.ts` for dev builds only:
 * `ps.spitter('charmander', 5)` puts 5 spitters in an arc 150 px ahead of the
 * player (the stage's own spitter species without a name). `load` fetches
 * the species' sprites, which a species outside the run's cast lacks.
 */
export const spitterDevTools = (game: () => Game | undefined, load: (dex: number) => void) => ({
  spitter: (kind?: EnemyId, count = 3) => {
    const g = game()
    if (!g) return console.warn('ps: start a run first')
    const species = kind ?? g.roster.spitters[stageIndexAt(g.time)] ?? g.roster.spitters.find((id) => id !== null)
    if (!species || !(species in ENEMIES)) return 'Name a species: ps.spitter("charmander", 5)'
    load(ENEMIES[species].dex)
    const p = g.player
    const base = dm.atan2(p.facing.y, p.facing.x)
    return Array.from({ length: count }, (_, i) => {
      const a = base + (i - (count - 1) / 2) * 0.4
      const e = spawnEnemy(g, species, p.x + dm.cos(a) * 150, p.y + dm.sin(a) * 150)
      makeSpitter(e, i / count)
      return e
    })
  },
})
