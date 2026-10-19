import { accountState, onAccountChange, signIn, type AccountState } from '../account'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { t } from '../i18n'
import { h, later } from './dom'
import { hint, menu, type Screen } from './screens'

type Action = { label: string; run: () => void }

/**
 * Asked when a guest taps Play (accounts on): sign in with Google or Discord,
 * which also creates the account, or play as a guest. Signing in leaves for the provider; an
 * account already open in another tab links right away and goes on to `play`.
 * Back, Esc or Backspace call `onBack`.
 */
export const playGate = (root: HTMLElement, input: Input, actions: { play: () => void; guest: () => void; back: () => void }): Screen => {
  const el = h('div', { class: 'screen dim' })
  let nav: ReturnType<typeof menu> | null = null

  const build = (s: AccountState, opening: boolean) => {
    const m = t().account
    const busy = s.kind === 'busy'
    const failed = s.kind === 'guest' && s.failed
    const all: Action[] = busy
      ? [{ label: m.back, run: () => leave(actions.back) }]
      : [
          { label: m.google, run: () => void signIn() },
          { label: t().discord.signIn, run: () => void signIn('discord') },
          { label: m.playAsGuest, run: () => leave(actions.guest) },
        ]
    const buttons = all.map((a) => h('button', { class: 'btn' }, a.label))
    nav?.off()
    nav = menu(input, buttons, (i) => (playSfx('select'), later(all[i]!.run)))
    const line = (text: string, cls = '') => h('p', { class: `account-line ${cls}` }, text)
    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop account' : 'dialog box account' },
        h('div', { class: 'dialog-title' }, m.gateTitle),
        busy ? line(m.busy, 'blink') : line(m.gatePitch),
        ...(failed ? [line(m.failed, 'account-error')] : []),
        ...(busy ? [] : [line(m.gateNewAccount, 'account-note')]),
        h('div', { class: 'buttons account-buttons' }, ...buttons),
        ...(busy ? [] : [line(m.gateGuestNote, 'account-note')]),
        hint(m.hintKeys, m.hintTouch),
      ),
    )
  }

  const offState = onAccountChange((s) => (s.kind === 'signedIn' ? leave(actions.play) : build(s, false)))
  const offKeys = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && (playSfx('select'), leave(actions.back)))

  const dispose = () => (nav?.off(), offState(), offKeys(), el.remove())

  let left = false
  /** Closes the gate and runs `next` after the current key dispatch. */
  const leave = (next: () => void) => {
    if (left) return
    left = true
    dispose()
    later(next)
  }

  build(accountState(), true)
  root.append(el)
  return { el, dispose }
}
