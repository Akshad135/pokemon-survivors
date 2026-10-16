import type { EnemyId } from '../data/enemies'
import type { RiftLegend } from '../data/rifts'
import { bossWaveAt, EVENTS, RUN_LENGTH, TRIO_IDS, TRIOS, type TrioId } from '../data/waves'
import { startEndless } from './endless'
import { pickLegend } from './rift'
import { enterArena } from './riftArena'
import { openPortal } from './riftPortal'
import { withTrio } from './roster'
import { spawnWaveBoss } from './spawner'
import type { Game } from './types'

/**
 * Dev-console shortcuts for staging bosses, rifts and the endless mode
 * (`ps.trio()`, `ps.boss()`, `ps.rift()`, `ps.portal()`, `ps.victory()`, `ps.endless()`, `ps.reaper()`).
 * Wired in `main.ts` for dev builds only.
 */
export const riftDevTools = (game: () => Game | undefined) => {
  const playing = (fn: (g: Game) => void) => () => {
    const g = game()
    if (g) fn(g)
  }
  /** Skips the regular timeline to `minute`, past every wave event (Mewtwo included). */
  const skipTo = (g: Game, minute: number) => {
    g.time = minute * 60
    g.nextEvent = EVENTS.length
  }
  return {
    /** Swaps the run's legendary trio for the upcoming trio slots (`ps.trio('beasts')`); returns its members. */
    trio: (id: TrioId) => {
      const g = game()
      if (!g || !TRIO_IDS.includes(id)) return `Trios: ${TRIO_IDS.join(', ')}`
      g.roster = withTrio(g.roster, id)
      return TRIOS[id]
    },
    /** Brings a boss in now, with its wave entrance (`ps.boss('entei')`); an earlier wave's boss flees as it would. */
    boss: (enemy: EnemyId) => playing((g) => spawnWaveBoss(g, enemy, bossWaveAt(enemy) ?? g.time))(),
    /** Steps straight into a rift arena (a random legendary, or the one given). */
    rift: (legend?: RiftLegend) => playing((g) => enterArena(g, legend ?? pickLegend(g.rng, g.rift.met), g.player.x, g.player.y))(),
    /** Opens a portal right next to the player. */
    portal: (legend?: RiftLegend) => playing((g) => openPortal(g, legend, { x: g.player.x + 48, y: g.player.y }))(),
    /** Ends the run as if Mewtwo just fell: the victory screen with the endless offer. */
    victory: playing((g) => {
      skipTo(g, RUN_LENGTH / 60)
      g.phase = 'victory'
      g.events.push({ kind: 'victory' })
    }),
    /** Jumps into endless mode at `minute` (default 19:30, half a minute before Arceus). */
    endless: (minute = 19.5) =>
      playing((g) => {
        skipTo(g, minute)
        g.endless = startEndless(RUN_LENGTH + 20)
        g.phase = 'playing'
      })(),
    /** Calls Arceus now (endless mode only). */
    reaper: playing((g) => {
      if (g.endless) g.endless.reaperAt = g.time
    }),
  }
}
