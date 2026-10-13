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
