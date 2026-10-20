import { accountsEnabled } from '../account'
import { track } from '../analytics'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { t } from '../i18n'
import { addHomeIcon, shareIcon } from '../render/art'
import { h, later, rich } from './dom'
import { installOffer, isIos, type InstallOffer } from './installOffer'
import { hint, menu, type Screen } from './screens'

/** Chromium's `beforeinstallprompt` event, which TypeScript's DOM types don't have. */
type PromptEvent = Event & { prompt: () => Promise<unknown>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const isPromptEvent = (e: Event): e is PromptEvent => 'prompt' in e && typeof e.prompt === 'function' && 'userChoice' in e

/** The prompt Chromium handed over, kept for the player's tap in Settings. */
let held: PromptEvent | null = null
/** `appinstalled` fired: the tab is still a tab, but there's nothing left to offer. */
let installedNow = false
const watchers = new Set<() => void>()
const changed = () => watchers.forEach((w) => w())

// Chromium fires this once the page qualifies (manifest, icons, HTTPS; no service worker needed).
// preventDefault keeps its own mini-infobar away: Settings offers the app instead.
window.addEventListener('beforeinstallprompt', (e) => {
  if (!isPromptEvent(e)) return
  e.preventDefault()
  held = e
  changed()
})

window.addEventListener('appinstalled', () => {
  held = null
  installedNow = true
  track('install', { step: 'installed' })
  changed()
})

const runningInstalled = () =>
  matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true)

/** How Settings → Sobre offers the app right now (see `installOffer`). */
export const currentInstallOffer = (): InstallOffer =>
  installOffer({ installed: installedNow || runningInstalled(), prompt: held !== null, ios: isIos(navigator.userAgent, navigator.maxTouchPoints) })

/** Calls `fn` whenever the offer may have changed (a prompt arrived, the app got installed). Returns the unsubscribe. */
export const onInstallChange = (fn: () => void) => {
  watchers.add(fn)
  return () => void watchers.delete(fn)
}

/**
 * Shows Chromium's install dialog. It needs a tap, click or key press: a
 * gamepad press isn't one, so `prompt()` refuses and the event stays kept for
 * the next try. Once shown, the event is spent whatever the answer (Chromium
 * may hand over a new one later).
 */
export const promptInstall = async () => {
  const e = held
  if (!e) return
  try {
    await e.prompt()
  } catch {
    return
  }
  held = null
  track('install', { step: 'prompt' })
  const { outcome } = await e.userChoice
  track('install', { step: outcome })
  changed()
}

/**
 * The iOS how-to (Settings → Sobre on an iPhone or iPad, whose Safari has no
 * install prompt): Share, then "Add to Home Screen". Home screen apps on iOS
 * keep their own storage, apart from Safari's, so with accounts it suggests
 * signing in to bring the progress along. OK, Esc or Backspace call
 * `onClose` after the key dispatch.
 */
export const installHelpScreen = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const m = t().install
  track('install', { step: 'ios' })
  const step = (icon: string, text: string) => h('li', { class: 'install-step' }, h('img', { src: icon, alt: '' }), rich(text))
  const ok = h('button', { class: 'btn' }, m.ok)
  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop account install-dialog' },
      h('div', { class: 'dialog-title' }, m.title),
      h('p', { class: 'account-line' }, m.pitch),
      h('ol', { class: 'install-steps' }, step(shareIcon(), m.share), step(addHomeIcon(), m.addHome)),
      accountsEnabled && h('p', { class: 'account-line account-note' }, m.iosStorage),
      h('div', { class: 'buttons account-buttons' }, ok),
      hint(t().account.hintKeys, t().account.hintTouch),
    ),
  )
  const nav = menu(input, [ok], () => close())
  const offKeys = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && close())

  let closed = false
  const dispose = () => {
    closed = true
    nav.off()
    offKeys()
    el.remove()
  }
  const close = () => {
    if (closed) return
    playSfx('select')
    dispose()
    later(onClose)
  }

  root.append(el)
  return { el, dispose }
}
