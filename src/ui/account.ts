import { accountState, onAccountChange, signIn, signOut, syncSave, type AccountState } from '../account'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { t } from '../i18n'
import { h, later, rich } from './dom'
import { hint, menu, type Screen } from './screens'

/** Names longer than this are cut on the title's chip (the dialog shows them whole). */
const CHIP_NAME = 10

const chipLabel = (s: AccountState) => {
  if (s.kind !== 'signedIn') return s.kind === 'busy' ? '…' : t().account.signIn
  return s.name.length > CHIP_NAME ? `${s.name.slice(0, CHIP_NAME - 1)}…` : s.name || 'OK'
}

/**
 * Account entry in the title screen's top-right corner (twin of the language
 * switch): "Sign in" for guests, the player's name and a sync dot once signed
 * in. A tap or `C` opens the account dialog. Returns a disposer.
 */
export const accountChip = (root: HTMLElement, input: Input, onOpen: () => void) => {
  const label = h('span', { class: 'account-name' })
  const dot = h('span', { class: 'sync-dot', 'aria-hidden': 'true' })
  const open = () => (playSfx('select'), later(onOpen))
  const el = h('button', { class: 'account-chip box', onclick: open }, dot, label, h('span', { class: 'key-hint' }, 'C'))
  const draw = (s: AccountState) => {
    label.textContent = chipLabel(s)
    dot.dataset.sync = s.kind === 'signedIn' ? s.sync : 'guest'
    el.setAttribute('aria-label', `${t().account.title}: ${chipLabel(s)}`)
  }
  draw(accountState())
  const offState = onAccountChange(draw)
  const offKey = input.onKey((key) => key === 'KeyC' && open())
  root.append(el)
  return () => (offState(), offKey(), el.remove())
}

type Action = { label: string; run: () => void }

/** What the dialog says and offers in each state. */
const content = (s: AccountState): { lines: Node[]; actions: Action[] } => {
  const m = t().account
  const line = (text: string, cls = '') => h('p', { class: `account-line ${cls}` }, text)
  switch (s.kind) {
    case 'busy':
      return { lines: [line(m.busy, 'blink')], actions: [] }
    case 'guest':
      return {
        lines: [line(m.pitch), ...(s.failed ? [line(m.failed, 'account-error')] : []), line(m.guest, 'account-note')],
        actions: [{ label: m.google, run: () => void signIn() }],
      }
    case 'signedIn':
      return {
        lines: [
          h('p', { class: 'account-line' }, rich(m.signedInAs(s.name))),
          h('p', { class: `account-line account-sync ${s.sync}` }, h('span', { class: 'sync-dot', 'data-sync': s.sync, 'aria-hidden': 'true' }), m[s.sync]),
          line(m.signOutNote, 'account-note'),
        ],
        actions: [
          { label: m.syncNow, run: () => void syncSave() },
          { label: m.signOut, run: () => void signOut() },
        ],
      }
  }
}

/**
 * Account dialog over the title: sign in with Google as a guest; once signed
 * in, the sync status, "Sync now" and "Sign out". It redraws on every change
 * of the account state. Back, Esc or Backspace close it and call `onClose`
 * after the current key dispatch.
 */
export const accountScreen = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const el = h('div', { class: 'screen dim' })
  let nav: ReturnType<typeof menu> | null = null

  const build = (s: AccountState, opening: boolean) => {
    const m = t().account
    const { lines, actions } = content(s)
    const all = [...actions, { label: m.back, run: close }]
    const buttons = all.map((a) => h('button', { class: 'btn' }, a.label))
    nav?.off()
    // A redraw keeps the cursor on the same entry when it still exists.
    nav = menu(input, buttons, (i) => (playSfx('select'), later(all[i]!.run)), { initial: Math.min(nav?.index ?? 0, buttons.length - 1) })
    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop account' : 'dialog box account' },
        h('div', { class: 'dialog-title' }, m.title),
        ...lines,
        h('div', { class: 'buttons account-buttons' }, ...buttons),
        hint(m.hintKeys, m.hintTouch),
      ),
    )
  }

  const offState = onAccountChange((s) => build(s, false))
  const offKeys = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && close())

  const dispose = () => {
    nav?.off()
    offState()
    offKeys()
    el.remove()
  }

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    playSfx('select')
    dispose()
    later(onClose)
  }

  build(accountState(), true)
  root.append(el)
  return { el, dispose }
}
