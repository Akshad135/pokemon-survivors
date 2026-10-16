type Child = Node | string | number | null | undefined | false
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>

/** Minimal hyperscript: `h('div', { class: 'x', onclick: fn }, child…)`. */
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]) => {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue
    if (typeof value === 'function') el.addEventListener(key.replace(/^on/, ''), value)
    else el.setAttribute(key, value === true ? '' : String(value))
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    el.append(child instanceof Node ? child : String(child))
  }
  return el
}

/** Sets text only when it changed – keeps per-frame HUD updates cheap. */
export const setText = (el: HTMLElement, text: string) => {
  if (el.textContent !== text) el.textContent = text
}

export const setStyle = (el: HTMLElement, prop: string, value: string) => {
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value)
}

/**
 * Translated text with light markup (see `i18n/pt.ts`): `*bold*` becomes <b>
 * and `_accent_` becomes <em>. Lets each language place names wherever its grammar wants.
 */
export const rich = (text: string, attrs: Attrs = {}) =>
  h(
    'span',
    attrs,
    ...text.split(/(\*[^*]+\*|_[^_]+_)/).map((part, i) =>
      i % 2 === 0 ? part : h(part.startsWith('*') ? 'b' : 'em', {}, part.slice(1, -1)),
    ),
  )

/** Runs after the current key/click dispatch, so the next screen doesn't receive the same press. */
export const later = (fn: () => void) => setTimeout(fn, 0)

/**
 * The top-right corner's row, shared by the account chip or the Poké Mart and
 * the support chip on their left, so they line up instead of overlapping.
 */
export const topRight = (root: HTMLElement) => root.querySelector<HTMLElement>(':scope > .top-right') ?? root.appendChild(h('div', { class: 'top-right' }))
