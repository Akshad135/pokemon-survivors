import { accountState, onAccountChange, signIn, signOut, syncSave, type AccountState } from '../account'
import { isAdmin } from '../admin'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { t } from '../i18n'
import { adminScreen } from './admin'
import { h, later, rich, topRight } from './dom'
import { profileEditor, profileScreen } from './profile'
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
  topRight(root).append(el)
  return () => (offState(), offKey(), el.remove())
}

type Action = { label: string; run: () => void }

/** Screens the dialog opens over itself: the profile editor, the player's profile and, for the admin, the gift desk. */
type Open = { editor: () => void; profile: (handle: string) => void; admin: () => void }

/** The profile part of a signed-in dialog: the handle and a way to it, or the call to create one. */
const profileContent = (handle: string | null | undefined, open: Open): { lines: Node[]; actions: Action[] } => {
  const m = t().account
  if (handle === undefined) return { lines: [], actions: [] }
  if (handle === null) return { lines: [h('p', { class: 'account-line' }, m.noProfile)], actions: [{ label: m.createProfile, run: open.editor }] }
  return { lines: [h('p', { class: 'account-line' }, rich(m.profile(handle)))], actions: [{ label: m.viewProfile, run: () => open.profile(handle) }] }
}

/** What the dialog says and offers in each state. `admin`: the API said this account runs the gift desk. */
const content = (s: AccountState, open: Open, admin: boolean): { lines: Node[]; actions: Action[] } => {
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
    case 'signedIn': {
      const profile = profileContent(s.handle, open)
      return {
        lines: [
          h('p', { class: 'account-line' }, rich(m.signedInAs(s.name))),
          h('p', { class: `account-line account-sync ${s.sync}` }, h('span', { class: 'sync-dot', 'data-sync': s.sync, 'aria-hidden': 'true' }), m[s.sync]),
          ...profile.lines,
          line(m.signOutNote, 'account-note'),
        ],
        actions: [
          ...profile.actions,
          // Admin only, so not translated (see `ui/admin.ts`).
          ...(admin ? [{ label: 'Painel admin', run: open.admin }] : []),
          { label: m.syncNow, run: () => void syncSave() },
          { label: m.signOut, run: () => void signOut() },
        ],
      }
    }
  }
}

/**
 * Account dialog over the title: sign in with Google as a guest; once signed
 * in, the sync status, the public profile (create it, or open it), "Sync now"
 * and "Sign out". It redraws on every change of the account state. Back, Esc
 * or Backspace close it and call `onClose` after the current key dispatch.
 */
export const accountScreen = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const el = h('div', { class: 'screen dim' })
  let nav: ReturnType<typeof menu> | null = null
  /** The profile or its editor, open over the dialog. */
  let sub: Screen | null = null
  /** Whether the API said this account is admin (asked once the player is signed in). */
  let admin = false

  /** Hides the dialog under `screen` until it closes, then draws it again. */
  const openSub = (open: (back: () => void) => Screen) => {
    nav?.off()
    el.classList.add('hidden')
    sub = open(() => {
      sub = null
      el.classList.remove('hidden')
      build(accountState(), false)
    })
  }

  const open: Open = {
    editor: () => openSub((back) => profileEditor(root, input, back)),
    profile: (handle) => openSub((back) => profileScreen(root, input, handle, back)),
    admin: () => openSub((back) => adminScreen(root, input, back)),
  }

  const build = (s: AccountState, opening: boolean) => {
    if (sub) return
    const m = t().account
    if (s.kind === 'signedIn' && !admin) void isAdmin().then((yes) => yes && !closed && ((admin = true), build(accountState(), false)))
    const { lines, actions } = content(s, open, admin)
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
  const offKeys = input.onKey((key) => !sub && (key === 'Escape' || key === 'Backspace') && close())

  const dispose = () => {
    sub?.dispose()
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

/**
 * Asked when a guest taps Play (accounts on): sign in with Google, which also
 * creates the account, or play as a guest. Signing in leaves for Google; an
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
