import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { context2d } from '../engine/pixelart'
import { locale, t, type Locale } from '../i18n'
import { logoScale, titleLogo } from '../render/logo'
import { h, later } from './dom'
import { languageSwitch } from './language'
import { menu, type Screen } from './screens'

/** Static site pages, one URL per language (they live outside the game bundle). */
const SITE_PAGES = {
  pt: { pokedex: '/pokedex/', guide: '/guia/', legal: '/legal/' },
  en: { pokedex: '/en/pokedex/', guide: '/en/guide/', legal: '/en/legal/' },
} as const satisfies Record<Locale, Record<string, string>>

const GITHUB_URL = 'https://github.com/pedrobarretto/pokemon-survivors'

export type TitleActions = {
  play: () => void
  /** Must rebuild the title in the picked language (without the intro). */
  language: (next: Locale) => void
  /** The menu is up: after the "press start" gesture, so the browser lets audio play. */
  ready: () => void
  /**
   * Opens Settings over the title. Closing them must rebuild the title (the
   * language may have changed), highlighting `focus`. No action, no button.
   */
  settings?: (focus: number) => Screen
}

/** Fits the logo to the viewport in whole device pixels per logo pixel. */
const fitLogo = (canvas: HTMLCanvasElement) => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  // Phones in landscape put the logo beside the menu (see CSS), so it gets half the width instead.
  const phoneLandscape = vh <= 500 && vw > vh
  const [maxW, maxH] = phoneLandscape ? [vw * 0.46, vh * 0.6] : [Math.min(vw * 0.9, 640), vh * 0.3]
  const k = logoScale(canvas.width, canvas.height, maxW, maxH, dpr)
  const width = `${(canvas.width * k) / dpr}px`
  if (canvas.style.width !== width) {
    canvas.style.width = width
    canvas.style.height = `${(canvas.height * k) / dpr}px`
  }
}

/**
 * Title screen over the live meadow: pixel logo, a blinking "press start",
 * then the main menu (Play, Pokédex, How to play, Settings) with the language
 * switch and footer links. `intro: false` opens straight on the menu (coming
 * back from another screen, or after a language switch).
 */
export const titleScreen = (root: HTMLElement, input: Input, actions: TitleActions, opts: { intro?: boolean; focus?: number }): Screen => {
  const m = t().home
  const pages = SITE_PAGES[locale()]
  const { settings } = actions
  const items = [
    { label: m.play, run: actions.play },
    { label: m.pokedex, run: () => location.assign(pages.pokedex) },
    { label: m.guide, run: () => location.assign(pages.guide) },
    ...(settings ? [{ label: m.settings, run: () => openSettings(settings) }] : []),
  ]

  const logo = h('canvas', { class: 'title-logo', width: 1, height: 1, 'aria-hidden': 'true' })
  void titleLogo().then((sprite) => {
    logo.width = sprite.width
    logo.height = sprite.height
    context2d(logo).drawImage(sprite, 0, 0)
    fitLogo(logo)
    logo.classList.add('shown')
  })

  const prompt = h('p', { class: 'press-start blink' }, h('span', { class: 'keys-only' }, m.pressKeys), h('span', { class: 'touch-only' }, m.pressTouch))
  const menuBox = h('nav', { class: 'title-menu box pop', 'aria-label': 'Menu' })
  const footer = h(
    'footer',
    { class: 'title-footer' },
    m.fanGame,
    ' · ',
    h('a', { href: pages.legal }, m.legal),
    ' · ',
    h('a', { href: GITHUB_URL, target: '_blank', rel: 'noopener' }, 'GitHub'),
  )
  const el = h('div', { class: 'screen title-home' }, h('h1', { class: 'sr-only' }, 'Pokémon Survivors'), logo, prompt, footer)

  let nav: ReturnType<typeof menu> | null = null
  let closeLanguage: (() => void) | null = null
  let offIntro: (() => void) | null = null
  let settingsScreen: Screen | null = null

  /** (Re)builds the menu buttons and their key/pointer handlers, with `focus` highlighted. */
  const showMenu = (focus: number) => {
    const buttons = items.map((item) => h('button', { class: 'title-item' }, item.label))
    nav = menu(input, buttons, (i) => {
      playSfx('select')
      // After this key dispatch, or the next screen would receive the same Enter.
      later(items[i]!.run)
    }, { initial: focus })
    closeLanguage = languageSwitch(root, input, actions.language)
    menuBox.replaceChildren(...buttons)
  }

  /** Settings replace the title (only the meadow stays): its keys and language switch stay off until they close and the title is rebuilt. */
  const openSettings = (open: (focus: number) => Screen) => {
    const at = nav?.index ?? 0
    nav?.off()
    closeLanguage?.()
    nav = closeLanguage = null
    el.classList.add('hidden')
    settingsScreen = open(at)
  }

  const enterMenu = () => {
    prompt.replaceWith(menuBox)
    showMenu(Math.min(opts.focus ?? 0, items.length - 1))
    actions.ready()
  }

  if (opts.intro) {
    // Any key, pad button or tap. `later` keeps that same press from also picking "Play".
    const start = () => {
      if (!offIntro) return
      playSfx('select')
      later(enterMenu)
      offIntro()
      offIntro = null
    }
    const offKey = input.onKey(start)
    const onTap = (e: Event) => e.target instanceof Element && !e.target.closest('a') && start()
    el.addEventListener('click', onTap)
    offIntro = () => (offKey(), el.removeEventListener('click', onTap))
  } else {
    enterMenu()
  }

  root.append(el)
  return {
    el,
    dim: 0.12,
    tick: () => logo.width > 1 && fitLogo(logo),
    dispose: () => (settingsScreen?.dispose(), offIntro?.(), nav?.off(), closeLanguage?.(), el.remove()),
  }
}

/**
 * "◀ Title" entry in the starter select's top-left corner (twin of the Poké
 * Mart entry). Esc and Backspace (pad B) do the same. Returns a disposer.
 */
export const titleButton = (root: HTMLElement, input: Input, onBack: () => void) => {
  const back = () => (playSfx('move'), later(onBack))
  const el = h('button', { class: 'back-entry box', onclick: back }, h('span', { class: 'back-arrow' }, '◀'), t().home.back, h('span', { class: 'key-hint' }, 'ESC'))
  const off = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && back())
  root.append(el)
  return () => (off(), el.remove())
}
