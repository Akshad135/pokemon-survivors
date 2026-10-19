import { accountState, accountsEnabled, onAccountChange, signIn } from '../account'
import { isAdmin } from '../admin'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { nextVote, parseSuggestionDraft, SUGGESTION, SUGGESTION_SORTS, withVote, type Suggestion, type SuggestionSort, type SuggestionStatus } from '../game/suggestions'
import { formatNumber, LOCALES, locale, t } from '../i18n'
import { bulbIcon } from '../render/art'
import { fetchSuggestions, postSuggestion, setSuggestionStatus, voteSuggestion } from '../suggestions'
import { h, later } from './dom'
import { profileEditor } from './profile'
import { hint, type Screen } from './screens'
import { actionBar, backButton, shellBody, tabStrip, topBar } from './shell'
import { nearestInDirection, type Direction } from './spatial'
import { toast } from './toasts'

/*
 * Ideias: the idea board. The admin's buttons on each idea are only shown to
 * the admin (the API answers 403 to anyone else), so their words are in
 * Portuguese only, like the gift desk's.
 */

const ADMIN: Readonly<Record<SuggestionStatus, string>> = { done: '✓ Marcar feita', open: 'Reabrir', hidden: 'Ocultar' }

/** A second tap on "Ocultar" within this long hides the idea; after it, the button asks again. */
const CONFIRM_MS = 4000

/** How long ago `iso` was, in the current language ("há 3 dias", "3 days ago"). */
const ago = (iso: string) => {
  const seconds = (Date.parse(iso) - Date.now()) / 1000
  const format = new Intl.RelativeTimeFormat(LOCALES[locale()].tag, { numeric: 'auto' })
  const units = [['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3600], ['minute', 60]] as const
  const unit = units.find(([, size]) => Math.abs(seconds) >= size)
  return unit ? format.format(Math.round(seconds / unit[1]), unit[0]) : format.format(0, 'second')
}

/** A date in the current language (`14/10/2026`). */
const longDay = (iso: string) => new Date(iso).toLocaleDateString(LOCALES[locale()].tag, { day: '2-digit', month: '2-digit', year: 'numeric' })

/** What the arrows reach, and a key that finds it again after a redraw. */
type Item = { el: HTMLElement; key: string }

type CardActions = { vote: (pressed: 1 | -1) => void; admin: ((status: SuggestionStatus) => void) | null }

/**
 * One idea: ▲ score ▼ on the left (just the score once it shipped), then
 * its title, details (three lines until tapped), who posted it and when,
 * and when it shipped. The admin gets its status buttons under it. `set`
 * shows a new score and vote.
 */
const ideaCard = (s: Suggestion, actions: CardActions) => {
  const m = t().ideas
  const open = s.status === 'open'
  const score = h('b', { class: 'idea-score' })
  const arrow = (dir: 1 | -1) =>
    h('button', { class: `idea-vote ${dir === 1 ? 'up' : 'down'}`, type: 'button', 'aria-label': dir === 1 ? m.up : m.down, title: dir === 1 ? m.up : m.down, onclick: () => actions.vote(dir) }, dir === 1 ? '▲' : '▼')
  const up = arrow(1)
  const down = arrow(-1)
  const body = s.body ? h('p', { class: 'idea-body', title: m.more }, s.body) : null
  body?.addEventListener('click', () => body.classList.toggle('open'))
  const admin = actions.admin
  const adminButtons = admin
    ? (open ? (['done', 'hidden'] as const) : (['open', 'hidden'] as const)).map((status) => {
        let armed = 0
        const b = h('button', { class: 'btn idea-admin-btn', type: 'button' }, ADMIN[status])
        b.addEventListener('click', () => {
          if (status === 'hidden' && performance.now() - armed > CONFIRM_MS) {
            armed = performance.now()
            b.textContent = 'Ocultar? Toque de novo'
            return
          }
          admin(status)
        })
        return b
      })
    : []
  const el = h(
    'article',
    { class: `idea box${open ? '' : ' shipped'}${s.mine ? ' mine' : ''}` },
    h('div', { class: 'idea-votes' }, open && up, score, open && down),
    h(
      'div',
      { class: 'idea-main' },
      h('h3', { class: 'idea-title' }, s.title),
      body,
      h('small', { class: 'idea-meta' }, `@${s.handle} · ${ago(s.at)}`, s.mine && h('span', { class: 'idea-you' }, m.you)),
      !open && h('p', { class: 'idea-done' }, h('span', { class: 'idea-tag' }, `✓ ${m.done}`), s.doneAt && h('small', {}, m.doneOn(longDay(s.doneAt)))),
      adminButtons.length > 0 && h('div', { class: 'idea-admin' }, ...adminButtons),
    ),
  )
  const set = (next: Suggestion) => {
    score.textContent = formatNumber(next.score)
    score.setAttribute('aria-label', m.score(next.score))
    up.classList.toggle('on', next.vote === 1)
    down.classList.toggle('on', next.vote === -1)
    up.setAttribute('aria-pressed', String(next.vote === 1))
    down.setAttribute('aria-pressed', String(next.vote === -1))
  }
  set(s)
  const items: Item[] = [
    ...(open ? [{ el: up, key: `${s.id}:up` }, { el: down, key: `${s.id}:down` }] : []),
    ...adminButtons.map((el, i) => ({ el, key: `${s.id}:admin${i}` })),
  ]
  return { el, items, set }
}

/**
 * The new idea's form: a title, optional details and how many are left of
 * the details. `posted` runs with the idea once the API took it, after the
 * form closed; `back` when it closes without one.
 */
const ideaForm = (root: HTMLElement, input: Input, posted: (s: Suggestion) => void, back: () => void): Screen => {
  const m = t().ideas.form
  const title = h('input', { class: 'field-input', type: 'text', maxlength: SUGGESTION.title.max, autocomplete: 'off', placeholder: m.titlePlaceholder, enterkeyhint: 'next' })
  const details = h('textarea', { class: 'field-input field-area', maxlength: SUGGESTION.body.max, rows: 4, placeholder: m.bodyPlaceholder })
  const count = h('small', { class: 'field-count' }, `0/${SUGGESTION.body.max}`)
  details.addEventListener('input', () => (count.textContent = `${details.value.length}/${SUGGESTION.body.max}`))
  const message = h('p', { class: 'field-message' }, m.note(SUGGESTION.perDay))
  const submit = h('button', { class: 'btn confirm', type: 'submit' }, m.send)
  const cancel = h('button', { class: 'btn', type: 'button' }, m.back)
  let busy = false
  let closed = false
  const say = (text: string) => {
    playSfx('denied')
    message.textContent = text
    message.classList.add('error')
  }
  const form = h(
    'form',
    {
      class: 'dialog box pop idea-form',
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault()
        if (busy) return
        const draft = parseSuggestionDraft({ title: title.value, body: details.value })
        if (!draft) return say([...title.value.trim()].length < SUGGESTION.title.min ? m.errors.short(SUGGESTION.title.min) : m.errors.invalid)
        busy = true
        submit.textContent = m.sending
        const result = await postSuggestion(draft)
        busy = false
        submit.textContent = m.send
        if (closed) return
        if (!result.ok) return say(result.reason === 'limit' ? m.errors.limit(SUGGESTION.perDay) : m.errors[result.reason])
        playSfx('unlock')
        dispose()
        later(() => posted(result.suggestion))
      },
    },
    h('div', { class: 'dialog-title' }, m.title),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, m.titleField), h('span', { class: 'field-box' }, title)),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, m.bodyField), h('span', { class: 'field-box' }, details), count),
    message,
    h('div', { class: 'buttons' }, submit, cancel),
  )
  const el = h('div', { class: 'screen dim' }, form)
  function dispose() {
    closed = true
    offKeys()
    el.remove()
  }
  const close = () => {
    if (closed) return
    playSfx('select')
    dispose()
    later(back)
  }
  cancel.addEventListener('click', close)
  // Inside the fields the game's keys are off (see `createInput`), so Esc is caught here.
  form.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  const offKeys = input.onKey((key) => key === 'Escape' && close())
  root.append(el)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) title.focus()
  return { el, dispose, dim: 0.5 }
}

const DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
}

/**
 * Ideias, the idea board: tabs for the open ideas by votes and newest
 * first, and the ones that shipped. Guests read it; with an account a
 * player votes each open idea up or down (the same arrow again takes the
 * vote back) and, once they have a handle, posts ideas from the action bar.
 * The admin also marks ideas shipped, reopens them or hides them.
 *
 * Keys: arrows move between the tabs, the votes and the action bar by where
 * they are on screen, Enter presses, Q/E switch tabs, N opens the form, Esc
 * goes back. `onClose` runs after the key dispatch.
 */
export const suggestionsScreen = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const m = t().ideas
  let sort: SuggestionSort = 'top'
  /** The tab on screen: loading, unreachable, or its ideas. */
  let list: Suggestion[] | 'loading' | 'offline' = 'loading'
  let admin = false
  let request = 0
  let closed = false
  let sub: Screen | null = null
  let items: Item[] = []
  let index = 0
  const cards = new Map<string, ReturnType<typeof ideaCard>>()
  /** The latest vote sent per idea: an answer to an older one is ignored. */
  const sent = new Map<string, number>()

  const tabs = tabStrip(
    SUGGESTION_SORTS.map((s) => m.tabs[s]),
    0,
    (i) => setSort(SUGGESTION_SORTS[i]!),
  )
  const listEl = h('div', { class: 'idea-list', 'aria-live': 'polite' })
  const postLabel = h('span', {})
  const post = h('button', { class: 'btn confirm ideas-post', type: 'button', onclick: () => later(compose) }, h('img', { src: bulbIcon(), alt: '' }), postLabel, h('span', { class: 'key-hint' }, 'N'))
  const bar = accountsEnabled ? actionBar(post) : null
  const el = h(
    'div',
    { class: 'screen shell dim ideas-screen' },
    topBar({ left: backButton(() => close()), title: m.title }),
    shellBody(h('p', { class: 'ideas-lead' }, m.lead), tabs.el, listEl, hint(m.hintKeys, m.hintTouch)),
    bar,
  )

  /** The action bar's words for this account: sign in, create a profile, or post. */
  const label = () => {
    const s = accountState()
    if (s.kind !== 'signedIn') return m.signIn
    return s.handle === null ? m.createProfile : m.post
  }

  const focus = (i: number, sound = true) => {
    if (items.length === 0) return
    index = Math.max(0, Math.min(i, items.length - 1))
    items.forEach((it, j) => it.el.classList.toggle('selected', j === index))
    items[index]!.el.scrollIntoView({ block: 'nearest' })
    if (sound) playSfx('move')
  }

  /** Gathers what the arrows reach, keeping the highlight on `keep` when it's still there, else on the first idea's ▲ (or retry, or the action bar). */
  const gather = (keep: string | null) => {
    const tabItems = [...tabs.el.querySelectorAll('button')].map((b, i) => ({ el: b, key: `tab:${i}` }))
    const retry = listEl.querySelector<HTMLElement>('.ideas-retry')
    const ideaItems = [...cards.values()].flatMap((c) => c.items)
    items = [...tabItems, ...(retry ? [{ el: retry, key: 'retry' }] : []), ...ideaItems, ...(bar ? [{ el: post, key: 'post' }] : [])]
    const kept = keep === null ? -1 : items.findIndex((it) => it.key === keep)
    const first = items.findIndex((it) => it.key !== 'post' && !it.key.startsWith('tab:'))
    focus(kept >= 0 ? kept : first >= 0 ? first : items.length - 1, false)
  }

  const status = (text: string, cls = '') => h('p', { class: `ideas-status ${cls}` }, text)

  /** Draws the tab's ideas; `keep` is the item to keep highlighted (null: the first idea). */
  const renderList = (keep: string | null = null) => {
    cards.clear()
    if (list === 'loading') listEl.replaceChildren(status(m.loading, 'blink'))
    else if (list === 'offline') listEl.replaceChildren(status(m.offline), h('button', { class: 'btn ideas-retry', type: 'button', onclick: () => void load() }, m.retry))
    else if (list.length === 0) listEl.replaceChildren(status(m.empty[sort]))
    else {
      listEl.replaceChildren(
        ...list.map((s) => {
          const card = ideaCard(s, { vote: (dir) => void vote(s.id, dir), admin: admin ? (next) => void setStatus(s, next) : null })
          cards.set(s.id, card)
          return card.el
        }),
      )
    }
    gather(keep)
  }

  const load = async () => {
    const id = ++request
    list = 'loading'
    renderList()
    const next = await fetchSuggestions(sort)
    if (id !== request || closed) return
    list = next ?? 'offline'
    renderList()
  }

  function setSort(next: SuggestionSort) {
    if (next === sort) return
    sort = next
    tabs.set(SUGGESTION_SORTS.indexOf(next))
    playSfx('move')
    void load()
  }

  /** Shows `s` in place of the idea with its id. */
  const replace = (s: Suggestion) => {
    if (typeof list !== 'object') return
    list = list.map((x) => (x.id === s.id ? s : x))
    cards.get(s.id)?.set(s)
  }

  /** ▲ or ▼ on an idea: shown at once, then set to what the API says (or back, offline). */
  const vote = async (id: string, pressed: 1 | -1) => {
    if (accountState().kind !== 'signedIn') return toast(root, m.voteGuest, 2200)
    const before = typeof list === 'object' ? list.find((s) => s.id === id) : undefined
    if (!before) return
    const next = nextVote(before.vote, pressed)
    replace(withVote(before, next))
    playSfx(next === 0 ? 'move' : 'select')
    const mine = (sent.get(id) ?? 0) + 1
    sent.set(id, mine)
    const answer = await voteSuggestion(id, next)
    if (closed || sent.get(id) !== mine) return
    const now = typeof list === 'object' ? list.find((s) => s.id === id) : undefined
    if (!now) return
    if (answer === 'closed') return (toast(root, m.closed, 2200), void load())
    if (!answer) return (toast(root, m.offline, 2200), replace(withVote(now, before.vote)))
    replace({ ...now, score: answer.score, vote: answer.vote })
  }

  const setStatus = async (s: Suggestion, next: SuggestionStatus) => {
    const ok = await setSuggestionStatus(s.id, next)
    if (closed) return
    toast(root, ok ? `${s.title}: ${ADMIN[next]}` : 'Não deu: sem conexão ou sem permissão.', 2200)
    if (ok) void load()
  }

  /** Hides the board under another screen; `back` brings it back as it was. */
  const openSub = (make: (back: () => void) => Screen) => {
    el.classList.add('hidden')
    sub = make(() => {
      sub = null
      el.classList.remove('hidden')
      postLabel.textContent = label()
      focus(index, false)
    })
  }

  /** The action bar: signs in, creates the profile, or opens the form. A posted idea shows on top of Novas. */
  function compose() {
    if (sub || closed) return
    playSfx('select')
    const s = accountState()
    if (s.kind !== 'signedIn') return void signIn()
    if (s.handle === null) return openSub((back) => profileEditor(root, input, () => back()))
    openSub((back) =>
      ideaForm(root, input, (idea) => {
        back()
        toast(root, m.posted, 2600)
        sort = 'new'
        tabs.set(SUGGESTION_SORTS.indexOf(sort))
        list = [idea]
        renderList()
        void load()
      }, back),
    )
  }

  const offKeys = input.onKey((key) => {
    if (sub || closed) return
    if (key === 'Escape' || key === 'Backspace') return close()
    const dir = DIRECTIONS[key]
    if (dir) {
      const next = nearestInDirection(items.map((it) => it.el.getBoundingClientRect()), index, dir)
      return next >= 0 && focus(next)
    }
    if (key === 'Enter' || key === 'Space') return void items[index]?.el.click()
    const step = key === 'KeyQ' || key === 'PageUp' ? -1 : key === 'KeyE' || key === 'PageDown' ? 1 : 0
    if (step) return setSort(SUGGESTION_SORTS[(SUGGESTION_SORTS.indexOf(sort) + step + SUGGESTION_SORTS.length) % SUGGESTION_SORTS.length]!)
    if (key === 'KeyN' && bar) compose()
  })

  // Signing in or out (or picking a handle) changes the votes shown and the action bar; a sync status changing alone doesn't.
  const who = () => {
    const s = accountState()
    return s.kind === 'signedIn' ? `in:${s.handle}` : s.kind
  }
  let seen = who()
  const offAccount = onAccountChange(() => {
    postLabel.textContent = label()
    if (who() === seen) return
    seen = who()
    if (!sub) void load()
  })

  const dispose = () => {
    closed = true
    request++
    sub?.dispose()
    offKeys()
    offAccount()
    el.remove()
  }

  function close() {
    if (closed) return
    playSfx('select')
    dispose()
    later(onClose)
  }

  postLabel.textContent = label()
  root.append(el)
  void load()
  void isAdmin().then((yes) => {
    if (!yes || closed) return
    admin = true
    if (typeof list === 'object') renderList(items[index]?.key ?? null)
  })
  return { el, dispose, dim: 0.5 }
}
