import { ENEMIES } from '../data/enemies'
import type { RiftLegend } from '../data/rifts'
import { ENCOUNTER, REVEAL_AT } from '../game/domainRules'
import { ENTRANCE, ENTRANCE_REVEAL } from '../game/legendScene'
import { isWaveLegend } from '../data/legendBosses'
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
 * The encounter's title card ("KYOGRE · Senhor dos Mares", or a wave
 * legendary's on the map): it shows from the moment the legendary reveals
 * itself until the camera heads back, following the scene's own clock
 * (pausing on it pauses the card). Part of the HUD.
 */
export const createRiftTitle = () => {
  const name = h('b', {})
  const epithet = h('span', {})
  const el = h('div', { class: 'legend-title hidden' }, name, epithet)
  let shown = false
  const update = (g: Game) => {
    const d = g.rift.arena?.domain
    // A wave legendary's entrance on the map shows the same card (`legendScene.ts`).
    const s = g.legendScene
    const wave = s?.kind === 'entrance' && isWaveLegend(s.enemy) && s.t >= ENTRANCE_REVEAL && s.t < ENTRANCE_REVEAL + ENTRANCE.hold + 0.3 ? s.enemy : null
    const show = wave !== null || (d?.act === 'encounter' && d.scene >= REVEAL_AT && d.scene < REVEAL_AT + ENCOUNTER.hold + 0.4)
    if (show && wave) {
      const boss = g.enemies.find((e) => e.id === s?.bossId)
      setText(name, `${boss?.shiny ? '★ ' : ''}${ENEMIES[wave].name}`)
      setText(epithet, t().legends.epithets[wave])
    } else if (show && d) {
      setText(name, `${g.rift.arena?.shiny ? '★ ' : ''}${ENEMIES[d.legend].name}`)
      setText(epithet, domainLines(d.legend)?.epithet ?? '')
    }
    if (show === shown) return
    shown = show
    el.classList.toggle('hidden', !show)
  }
  return { el, update }
}
