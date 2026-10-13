import { describe, expect, it } from 'vitest'
import { html, jsonLd, raw } from './html'

describe('html', () => {
  it('escapes interpolated text but keeps nested templates and raw markup', () => {
    const name = '<b>"Farfetch\'d" & co</b>'
    expect(html`<p title="${name}">${name}${html`<i>${1}</i>`}${raw('<br>')}</p>`.__html).toBe(
      '<p title="&lt;b&gt;&quot;Farfetch&#39;d&quot; &amp; co&lt;/b&gt;">&lt;b&gt;&quot;Farfetch&#39;d&quot; &amp; co&lt;/b&gt;<i>1</i><br></p>',
    )
  })

  it('renders lists and skips false, null and undefined', () => {
    expect(html`<ul>${['a', 'b'].map((x) => html`<li>${x}</li>`)}${false}${null}${undefined}</ul>`.__html).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('keeps JSON-LD from closing its script tag', () => {
    expect(jsonLd({ name: '</script>' }).__html).toBe('{"name":"\\u003c/script>"}')
  })
})
