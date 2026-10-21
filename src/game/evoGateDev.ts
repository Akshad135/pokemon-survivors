import { EVO_ITEM_IDS, type EvoItemId } from '../data/shop'
import { missingEvoItems } from './evoGate'
import type { Game } from './types'

/**
 * Dev-console helper for evolution items found in a run, wired in `main.ts`
 * for dev builds only: `ps.dropEvo()` drops the first item the run's Pokémon
 * lacks 40 px to the right of the player, as a boss would
 * (`ps.dropEvo('dawnStone')` any item).
 */
export const evoGateDevTools = (game: () => Game | undefined) => ({
  dropEvo: (id?: EvoItemId) => {
    const g = game()
    if (!g) return console.warn('ps: start a run first')
    if (id !== undefined && !EVO_ITEM_IDS.includes(id)) return `Items: ${EVO_ITEM_IDS.join(', ')}`
    const item = id ?? missingEvoItems(g)[0]
    if (!item) return 'Nothing missing: this Pokémon has no item-locked branch ahead'
    g.pickups.push({ id: g.nextId++, x: g.player.x + 40, y: g.player.y, vx: 0, vy: 0, attracted: false, age: 0, kind: 'evoItem', item })
    return item
  },
})
