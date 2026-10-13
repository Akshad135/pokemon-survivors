/**
 * Progressive enhancement for the static site pages. The HTML is complete
 * without it; this only adds the Pokédex filters, shiny toggles and tap-to-walk,
 * and remembers the language for the game. It must never import game code, so
 * the game and the site never load each other's bundles.
 */

/** Same key as `src/i18n`: picking PT/EN here makes "Play" open the game in that language. */
const LANG_KEY = 'ps:lang'

document.documentElement.classList.add('js')

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-lang]')) {
  link.addEventListener('click', () => {
    try {
      localStorage.setItem(LANG_KEY, link.dataset.lang ?? '')
    } catch {
      // Storage blocked: the game falls back to the page language.
    }
  })
}

/** Lowercase without accents or punctuation, like the cards' `data-search`. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const FILTERS = ['q', 'region', 'type', 'role'] as const

type Filters = Record<(typeof FILTERS)[number], string>

const matches = (card: HTMLElement, f: Filters) => {
  const d = card.dataset
  const words = (d.search ?? '').replace(/-/g, ' ')
  return (
    (!f.q || f.q.split(' ').every((w) => words.includes(w))) &&
    (!f.region || d.region === f.region) &&
    (!f.type || (d.types ?? '').split(' ').includes(f.type)) &&
    (!f.role || (d.roles ?? '').split(' ').includes(f.role))
  )
}

const setShiny = (card: HTMLElement, on: boolean) => {
  const button = card.querySelector('.shiny-btn')
  if (!button) return
  card.classList.toggle('is-shiny', on)
  button.setAttribute('aria-pressed', String(on))
  const portrait = card.querySelector<HTMLImageElement>('img.portrait[data-shiny-src]')
  if (portrait) {
    portrait.dataset.normalSrc ??= portrait.src
    portrait.src = on ? (portrait.dataset.shinySrc ?? portrait.src) : portrait.dataset.normalSrc
  }
}

const pokedex = (form: HTMLFormElement) => {
  const cards = [...document.querySelectorAll<HTMLElement>('.dex-card')]
  const count = form.querySelector<HTMLElement>('.dex-count')
  const empty = document.querySelector<HTMLElement>('.dex-empty')
  const control = (name: string) => form.elements.namedItem(name)

  const read = (): Filters => {
    const data = new FormData(form)
    const value = (name: string) => String(data.get(name) ?? '')
    return { q: normalize(value('q')), region: value('region'), type: value('type'), role: value('role') }
  }

  const apply = () => {
    const filters = read()
    let shown = 0
    for (const card of cards) {
      card.hidden = !matches(card, filters)
      if (!card.hidden) shown++
    }
    if (count) {
      // Both templates hold one number ("2 Pokémon found"); swap in the real count.
      const template = (shown === 1 ? count.dataset.one : count.dataset.other) ?? ''
      count.textContent = template.replace(/\d+/, String(shown))
    }
    if (empty) empty.hidden = shown > 0
    const params = new URLSearchParams(FILTERS.flatMap((k) => (filters[k] ? [[k, filters[k]]] : [])))
    const query = params.toString()
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`)
  }

  // Filters live in the query string, so a filtered view can be shared.
  const params = new URLSearchParams(location.search)
  for (const name of FILTERS) {
    const value = params.get(name)
    const el = control(name)
    if (value === null || !el) continue
    if (el instanceof RadioNodeList) el.value = value
    else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = value
  }

  /** A link to `#charizard` must show Charizard even if the filters hide it. */
  const reveal = () => {
    const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null
    if (!target?.classList.contains('dex-card') || !target.hidden) return
    form.reset()
    apply()
    target.scrollIntoView()
  }

  form.addEventListener('input', apply)
  form.addEventListener('submit', (e) => e.preventDefault())
  form.addEventListener('reset', () => requestAnimationFrame(() => (apply(), syncShinyAll())))
  window.addEventListener('hashchange', reveal)

  const shinyAll = control('shiny')
  const syncShinyAll = () => {
    if (shinyAll instanceof HTMLInputElement) for (const card of cards) setShiny(card, shinyAll.checked)
  }
  if (shinyAll instanceof HTMLInputElement) shinyAll.addEventListener('change', syncShinyAll)

  for (const card of cards) {
    card.querySelector('.shiny-btn')?.addEventListener('click', () => setShiny(card, !card.classList.contains('is-shiny')))
    // Touch screens have no hover: tapping the sprite toggles the walk cycle.
    card.querySelector('.stage')?.addEventListener('click', () => card.classList.toggle('walking'))
  }

  apply()
  reveal()
}

const form = document.querySelector<HTMLFormElement>('#dex-filters')
if (form) pokedex(form)
