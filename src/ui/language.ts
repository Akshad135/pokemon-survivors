import type { Input } from '../engine/input'
import { locale, LOCALE_IDS, LOCALES, nextLocale, t, type Locale } from '../i18n'
import { h, later } from './dom'

/**
 * PT | EN | ES switch in the title screen's top-left corner (mirrors the Poké Mart
 * entry on the right). Tapping a language picks it and `I` cycles them.
 * `onPick` must rebuild the screen. Returns a disposer.
 */
export const languageSwitch = (root: HTMLElement, input: Input, onPick: (next: Locale) => void) => {
  const pick = (next: Locale) => next !== locale() && later(() => onPick(next))
  const el = h(
    'div',
    { class: 'lang-switch box', role: 'group', 'aria-label': t().language },
    ...LOCALE_IDS.map((id) =>
      h(
        'button',
        {
          class: id === locale() ? 'lang-option selected' : 'lang-option',
          'aria-pressed': String(id === locale()),
          lang: LOCALES[id].tag,
          title: LOCALES[id].name,
          onclick: () => pick(id),
        },
        LOCALES[id].short,
      ),
    ),
    h('span', { class: 'key-hint' }, 'I'),
  )
  const off = input.onKey((key) => key === 'KeyI' && pick(nextLocale(locale())))
  root.append(el)
  return () => (off(), el.remove())
}
