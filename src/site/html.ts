/**
 * Tiny HTML templating for the build-time site pages. `html` escapes every
 * interpolated value unless it is already `Html` (a nested template or `raw`),
 * so data and translations can never break the markup.
 */
export type Html = { readonly __html: string }

export type Child = Html | string | number | boolean | null | undefined | readonly Child[]

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c)

const isHtml = (c: Child): c is Html => typeof c === 'object' && c !== null && '__html' in c

/** `false`, `null` and `undefined` render nothing, so `cond && html\`…\`` works inline. */
const render = (c: Child): string => {
  if (c === null || c === undefined || c === false || c === true) return ''
  if (isHtml(c)) return c.__html
  if (typeof c === 'object') return c.map(render).join('')
  return escape(String(c))
}

export const html = (strings: TemplateStringsArray, ...values: Child[]): Html => ({
  __html: strings.reduce((out, s, i) => out + render(values[i - 1]) + s),
})

/** Trusted markup (inline CSS, JSON-LD), inserted as is. */
export const raw = (markup: string): Html => ({ __html: markup })

/** JSON for a `<script type="application/ld+json">`: `<` is escaped so a string can't close the tag. */
export const jsonLd = (data: unknown) => raw(JSON.stringify(data).replace(/</g, '\\u003c'))
