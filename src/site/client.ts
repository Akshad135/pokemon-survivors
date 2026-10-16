/**
 * Progressive enhancement for the static site pages. The HTML is complete
 * without it; this only adds the Pokédex filters, shiny toggles and tap-to-walk,
 * the donation form, and remembers the language for the game. It must never
 * import game code (plain data like `data/donations` is fine), so the game and
 * the site never load each other's bundles.
 */

import { inBrazil, parseDonation } from '../data/donations'

/** Same key as `src/i18n`: picking PT/EN/ES here makes "Play" open the game in that language. */
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

const FILTERS = ['q', 'region', 'type', 'tier', 'role'] as const

type Filters = Record<(typeof FILTERS)[number], string>

const matches = (card: HTMLElement, f: Filters) => {
  const d = card.dataset
  const words = (d.search ?? '').replace(/-/g, ' ')
  return (
    (!f.q || f.q.split(' ').every((w) => words.includes(w))) &&
    (!f.region || d.region === f.region) &&
    (!f.type || (d.types ?? '').split(' ').includes(f.type)) &&
    (!f.tier || d.tier === f.tier) &&
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
    return { q: normalize(value('q')), region: value('region'), type: value('type'), tier: value('tier'), role: value('role') }
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

/** The accounts API, which opens AbacatePay checkouts (`POST /donations`). */
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

/**
 * The support page: puts first (and marks) the way to pay that the time zone
 * suggests, says thanks when a checkout comes back with `?thanks=1`, and turns
 * the Brazilian form into an AbacatePay checkout.
 */
const support = (ways: HTMLElement) => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const guess = document.getElementById(inBrazil(zone) ? 'donate-br' : 'donate-intl')
  if (guess) {
    ways.prepend(guess)
    guess.classList.add('is-guess')
  }

  const thanks = document.getElementById('donate-thanks')
  if (thanks && new URLSearchParams(location.search).has('thanks')) thanks.hidden = false

  const form = document.querySelector<HTMLFormElement>('#donate-form')
  if (!form) return
  const button = form.querySelector('button')
  const error = form.querySelector<HTMLElement>('.donate-error')
  const other = form.elements.namedItem('other')
  const presets = form.querySelectorAll<HTMLInputElement>('input[name="preset"]')
  if (!button || !error || !(other instanceof HTMLInputElement)) return

  const amount = () => parseDonation(other.value || (new FormData(form).get('preset') ?? ''))
  const sync = () => {
    const value = amount()
    // The label holds one number ("Doar R$ 10"); swap in the chosen amount.
    button.textContent = (form.dataset.cta ?? '').replace(/\d+/, String(value ?? '…'))
    button.disabled = value === null
  }

  // Typing an amount unpicks the presets, and picking one clears it.
  other.addEventListener('input', () => {
    if (other.value) for (const p of presets) p.checked = false
    sync()
  })
  for (const p of presets) p.addEventListener('change', () => ((other.value = ''), sync()))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const value = amount()
    if (value === null) return
    error.hidden = true
    button.disabled = true
    button.textContent = form.dataset.loading ?? ''
    try {
      if (!API_URL) throw new Error('no API')
      const res = await fetch(`${API_URL}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value, page: location.pathname }),
      })
      const body: unknown = await res.json()
      const url = typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string' ? body.url : null
      if (!res.ok || !url) throw new Error(`donation: ${res.status}`)
      location.href = url
    } catch {
      error.textContent = form.dataset.error ?? ''
      error.hidden = false
      sync()
    }
  })

  // Back from the checkout, the page may come from the bfcache with the button still "Opening…".
  window.addEventListener('pageshow', sync)
  sync()
}

const ways = document.getElementById('donate-ways')
if (ways) support(ways)
