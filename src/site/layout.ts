import type { Locale } from '../i18n'
import { SITE_MESSAGES } from '../i18n/site'
import { html, jsonLd, raw, type Html } from './html'
import { absolute, alternates, REPO_URL, ROUTES, type PageId, type RouteId } from './routes'

export type PageMeta = {
  id: PageId
  locale: Locale
  title: string
  description: string
  /** schema.org nodes for this page, merged into one `@graph` with the breadcrumbs. */
  schema?: readonly Record<string, unknown>[]
  /** Page-specific CSS generated from data (the Pokédex sprite sheets), inlined as is. */
  css?: string
}

const NAV: readonly RouteId[] = ['play', 'pokedex', 'guide', 'changelog']

const other = (locale: Locale): Locale => (locale === 'pt' ? 'en' : 'pt')

const head = ({ id, locale, title, description, schema = [], css }: PageMeta) => {
  const m = SITE_MESSAGES[locale]
  const url = absolute(ROUTES[id][locale])
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: title,
      description,
      inLanguage: m.lang.tag,
      isPartOf: { '@id': `${absolute('/')}#website` },
      about: { '@id': `${absolute('/')}#game` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Pokémon Survivors', item: absolute(ROUTES.play[locale]) },
        { '@type': 'ListItem', position: 2, name: m.nav[id], item: url },
      ],
    },
    ...schema,
  ]
  return html`<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#101820" />
    <meta name="color-scheme" content="dark" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    ${alternates(id).map((a) => html`<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />\n    `)}<meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pokémon Survivors" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${absolute('/og.png')}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="${m.lang.og}" />
    <meta property="og:locale:alternate" content="${SITE_MESSAGES[other(locale)].lang.og}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/assets/pokemon/4/portrait.png" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="stylesheet" href="/src/site/site.css" />
    ${css && html`<style>${raw(css)}</style>`}
    <script type="application/ld+json">${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script>
    <script type="module" src="/src/site/client.ts"></script>
  </head>`
}

const header = (id: PageId, locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  const to = other(locale)
  return html`<a class="skip" href="#content">${m.skip}</a>
  <header class="site-header">
    <a class="brand" href="${ROUTES.play[locale]}"><img src="/assets/pokemon/4/portrait.png" width="40" height="40" alt="" /><span>Pokémon<br />Survivors</span></a>
    <nav class="site-nav" aria-label="${m.nav.label}">
      ${NAV.map(
        (r) => html`<a href="${ROUTES[r][locale]}" class="${r === 'play' ? 'nav-play' : ''}"${r === id ? html` aria-current="page"` : ''}>${m.nav[r]}</a>`,
      )}
    </nav>
    <nav class="lang" aria-label="${m.nav.language}">
      <a href="${ROUTES[id].pt}" hreflang="pt-BR" lang="pt-BR" data-lang="pt"${locale === 'pt' ? html` aria-current="true"` : ''}>PT</a>
      <a href="${ROUTES[id].en}" hreflang="en" lang="en" data-lang="en" title="${SITE_MESSAGES[to].lang.switchTo}"${locale === 'en' ? html` aria-current="true"` : ''}>EN</a>
    </nav>
  </header>`
}

const footer = (locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  return html`<footer class="site-footer">
    <p>${m.footer.disclaimer}</p>
    <p class="footer-links">
      <a href="${ROUTES.legal[locale]}">${m.footer.legal}</a>
      <a href="${REPO_URL}/blob/main/CREDITS.md">${m.footer.credits}</a>
      <a href="${REPO_URL}">${m.footer.source}</a>
    </p>
  </footer>`
}

/** Full HTML document of a site page: head (SEO, hreflang, JSON-LD), shared header and footer. */
export const layout = (meta: PageMeta, main: Html) => {
  const m = SITE_MESSAGES[meta.locale]
  return `<!doctype html>
<html lang="${m.lang.tag}">
  ${head(meta).__html}
  <body>
  ${header(meta.id, meta.locale).__html}
  <main id="content" class="site-main">
${main.__html}
  </main>
  ${footer(meta.locale).__html}
  </body>
</html>
`
}
