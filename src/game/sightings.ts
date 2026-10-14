import { ENEMIES } from '../data/enemies'
import { PLAYABLE } from '../data/hatchlings'
import { MEOWTH_DEX } from './mapEventRules'
import type { Game } from './types'

/** Sightings checked per second: often enough to catch a swarm crossing the screen. */
const CHECKS_PER_SECOND = 4

const onScreen = (g: Game, x: number, y: number) =>
  x >= g.camera.x && x <= g.camera.x + g.view.w && y >= g.camera.y && y <= g.camera.y + g.view.h

/**
 * Logs every species on screen into the run's Pokédex log: wild Pokémon, the
 * fleeing Meowth and the player's own form, which also counts as caught (it's
 * theirs, like an evolution on the handhelds).
 */
export const updateSightings = (g: Game, dt: number) => {
  if (Math.floor(g.time * CHECKS_PER_SECOND) === Math.floor((g.time - dt) * CHECKS_PER_SECOND)) return
  const seen = g.dexLog.seen
  const form = PLAYABLE[g.starter].line[g.player.stage]!.dex
  seen.add(form)
  g.dexLog.own.set(form, g.player.shiny)
  for (const e of g.enemies) if (e.dying < 0 && onScreen(g, e.x, e.y)) seen.add(ENEMIES[e.kind].dex)
  for (const ev of g.mapEvents.list) if (ev.kind === 'meowth' && ev.gone < 0 && onScreen(g, ev.x, ev.y)) seen.add(MEOWTH_DEX)
}
