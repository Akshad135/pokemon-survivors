import { describe, expect, it } from 'vitest'
import { CHANGELOG } from './changelog'
import { SITE_PAGES, sitemap } from '.'
import { LOCALE_IDS } from '../i18n'
import { absolute, HREFLANG, ROUTE_IDS, ROUTES } from './routes'

describe('site pages', () => {
  it('render with their own canonical and hreflang links to every language', () => {
    for (const page of SITE_PAGES) {
      const doc = page.render()
      const id = ROUTE_IDS.find((r) => LOCALE_IDS.some((l) => ROUTES[r][l] === page.path))!
      expect(doc).toContain(`<link rel="canonical" href="${absolute(page.path)}" />`)
      for (const l of LOCALE_IDS) expect(doc).toContain(`hreflang="${HREFLANG[l]}" href="${absolute(ROUTES[id][l])}"`)
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
