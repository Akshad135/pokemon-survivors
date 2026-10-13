import { formatTime } from '../engine/math'
import { overtime } from '../game/endless'
import type { Game } from '../game/types'
import { t } from '../i18n'
import { h, setText } from './dom'

type Pill = { text: string; kind: 'portal' | 'arena' | 'endless' | 'reaper'; urgent: boolean } | null

/** What the pill under the timer says: an open rift, the arena's collapse, or the endless clock and Arceus. */
const pillFor = (g: Game): Pill => {
  const m = t().rifts
  const { portal, arena } = g.rift
  if (arena) {
    if (arena.loot !== null) return null
    return { text: m.hudArena(formatTime(Math.ceil(arena.left))), kind: 'arena', urgent: arena.left < 10 }
  }
  if (portal) return { text: m.hudPortal(formatTime(Math.ceil(portal.left))), kind: 'portal', urgent: portal.left < 8 }
  const s = g.endless
  if (!s) return null
  if (s.reaperId !== null) return { text: m.hudHunting, kind: 'reaper', urgent: true }
  const until = s.reaperAt - g.time
  if (until < 60) return { text: m.hudReaper(formatTime(Math.ceil(until))), kind: 'reaper', urgent: until < 10 }
  return { text: m.hudEndless(formatTime(overtime(g.time))), kind: 'endless', urgent: false }
}

/** Small status pill under the run timer for rifts and the endless mode. Part of the HUD. */
export const createRiftHud = () => {
  const el = h('div', { class: 'rift-pill box hidden' })
  let cls = ''
  const update = (g: Game) => {
    const pill = pillFor(g)
    const next = pill ? `rift-pill box rift-${pill.kind}${pill.urgent ? ' urgent' : ''}` : 'rift-pill box hidden'
    if (next !== cls) el.className = cls = next
    if (pill) setText(el, pill.text)
  }
  return { el, update }
}
