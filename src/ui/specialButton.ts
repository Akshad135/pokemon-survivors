import { TYPE_COLORS } from '../data/types'
import { resolveSpecial, specialReady } from '../game/special'
import type { Game } from '../game/types'
import { specialIcon } from '../render/specialFx'
import { h, setStyle } from './dom'

/**
 * Special attack controls: a HUD badge next to the move slots (desktop) and a
 * round touch button in the bottom-right corner (coarse pointers). Both show the
 * move icon, the cooldown fill and a "ready" pulse; CSS picks which one shows.
 */
export const createSpecialControls = (onPress: () => void) => {
  const badgeIcon = h('img', { alt: '' })
  const buttonIcon = h('img', { alt: '' })
  const badge = h('div', { class: 'special special-badge' }, badgeIcon, h('span', { class: 'special-key' }, 'ESPAÇO'))
  const button = h('button', { class: 'special special-button', type: 'button', 'aria-label': 'Ataque especial' }, buttonIcon)

  // Claim the touch so the floating joystick (pointerdown anywhere) never sees it.
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    onPress()
  })
  button.addEventListener('contextmenu', (e) => e.preventDefault())

  let key = ''

  const update = (g: Game) => {
    const r = resolveSpecial(g.starter, g.player.stage)
    const s = g.special
    if (key !== r.tier.name) {
      key = r.tier.name
      const src = specialIcon(r.id)
      badgeIcon.setAttribute('src', src)
      buttonIcon.setAttribute('src', src)
      badge.title = `${r.tier.name} (Espaço)`
      for (const el of [badge, button]) setStyle(el, '--type', TYPE_COLORS[r.def.type])
    }
    const fill = (s.total > 0 ? 1 - s.cooldown / s.total : 1).toFixed(3)
    const ready = specialReady(s)
    for (const el of [badge, button]) {
      setStyle(el, '--fill', fill)
      el.classList.toggle('ready', ready)
    }
  }

  return { badge, button, update }
}
