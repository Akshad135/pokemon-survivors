import { t } from '../i18n'
import { heartIcon } from '../render/art'
import { KOFI_URL } from '../site/routes'
import { h, topRight } from './dom'

/**
 * "♥ Apoie o projeto" chip in the top-right corner of the menus before a run
 * (title and starter select), left of the account chip or the Poké Mart. It
 * opens the Ko-fi page in a new tab; phones show just the heart. Returns a disposer.
 */
export const supportButton = (root: HTMLElement) => {
  const label = t().home.support
  const el = h(
    'a',
    { class: 'support-chip box', href: KOFI_URL, target: '_blank', rel: 'noopener', title: label, 'aria-label': label },
    h('img', { src: heartIcon(), alt: '' }),
    h('span', {}, label),
  )
  topRight(root).append(el)
  return () => el.remove()
}
