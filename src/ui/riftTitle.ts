import { ENEMIES } from '../data/enemies'
import type { RiftLegend } from '../data/rifts'
import { ENCOUNTER, REVEAL_AT } from '../game/domainRules'
import type { Game } from '../game/types'
import { t } from '../i18n'
import type { DomainLines } from '../i18n/pt'
import { h, setText } from './dom'

/** A legendary's lines (`rifts.domains`), if its domain has them. */
export const domainLines = (legend: RiftLegend): DomainLines | undefined => {
  const all: Partial<Record<RiftLegend, DomainLines>> = t().rifts.domains
  return all[legend]
}

/**
 * The encounter's title card ("KYOGRE · Senhor dos Mares"): it shows from the
 * moment the legendary reveals itself until the camera heads back, following
 * the encounter scene's own clock (pausing on it pauses the card). Part of the HUD.
 */
export const createRiftTitle = () => {
  const name = h('b', {})
  const epithet = h('span', {})
  const el = h('div', { class: 'legend-title hidden' }, name, epithet)
  let shown = false
  const update = (g: Game) => {
    const d = g.rift.arena?.domain
    const show = d?.act === 'encounter' && d.scene >= REVEAL_AT && d.scene < REVEAL_AT + ENCOUNTER.hold + 0.4
    if (show && d) {
      setText(name, `${g.rift.arena?.shiny ? '★ ' : ''}${ENEMIES[d.legend].name}`)
      setText(epithet, domainLines(d.legend)?.epithet ?? '')
    }
    if (show === shown) return
    shown = show
    el.classList.toggle('hidden', !show)
  }
  return { el, update }
}
