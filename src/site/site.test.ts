import { describe, expect, it } from 'vitest'
import { CHANGELOG } from './changelog'
import { SITE_PAGES, sitemap } from '.'
import { absolute, ROUTE_IDS, ROUTES } from './routes'

describe('site pages', () => {
  it('render with their own canonical and hreflang links to both languages', () => {
    for (const page of SITE_PAGES) {
      const doc = page.render()
      const id = ROUTE_IDS.find((r) => ROUTES[r].pt === page.path || ROUTES[r].en === page.path)!
      expect(doc).toContain(`<link rel="canonical" href="${absolute(page.path)}" />`)
      expect(doc).toContain(`hreflang="pt-BR" href="${absolute(ROUTES[id].pt)}"`)
      expect(doc).toContain(`hreflang="en" href="${absolute(ROUTES[id].en)}"`)
      expect(doc.match(/<h1>/g)).toHaveLength(1)
    }
  })

  it('are all in the sitemap, along with the game pages', () => {
    const xml = sitemap()
    for (const id of ROUTE_IDS) for (const path of Object.values(ROUTES[id])) expect(xml).toContain(`<loc>${absolute(path)}</loc>`)
  })
})

describe('changelog', () => {
  it('is newest first with ISO dates', () => {
    const dates = CHANGELOG.map((e) => e.date)
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect([...dates].sort().reverse()).toEqual(dates)
  })
})
