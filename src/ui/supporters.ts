import { accountState, accountsEnabled, onAccountChange, onGifts, signIn, syncSave } from '../account'
import { playCry, playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { HATCHLINGS, isHatchling, PLAYABLE, PLAYABLE_IDS, type PlayableId } from '../data/hatchlings'
import { POLL, SUPPORTER, type PollOptionId } from '../data/supporters'
import { pendingPicks, pickShiny, ownsShiny, shinyChoices } from '../game/shinyPicks'
import { canWalkWith, isSupporter, parseCode, type SupporterStatus } from '../game/supporters'
import { LOCALES, locale, t } from '../i18n'
import { eggIcon, heartIcon, medalIcon, pokeballIcon, sparkleIcon, supporterIcon } from '../render/art'
import { frameIcon } from '../render/cosmetics'
import { cryUrl, portraitUrl } from '../render/sprites'
import { ROUTES } from '../site/routes'
import { fetchPoll, fetchSupporterStatus, fetchWall, redeemCode, setSupporterPublic, vote } from '../supporters'
import { h, later, rich, topRight } from './dom'
import { hatchScene } from './incubator'
import { profileEditor, profileScreen } from './profile'
import { loadSave, updateSave } from './save'
import { hint, menu, type Screen } from './screens'
import { toast } from './toasts'

/**
 * Apoiadores: what donating brings, the way to the support page, and what a
 * supporter can do with it (pick their shiny, a companion, vote, show their
 * badge). Rewards need an account: the support page takes the player's
 * handle, and a code redeems a donation made without one.
 */

type Action = { label: string; run: () => void }

/** A date of the account's history, in the current language (`14/10/2026`). */
const longDay = (iso: string) => new Date(iso).toLocaleDateString(LOCALES[locale()].tag, { day: '2-digit', month: '2-digit', year: 'numeric' })

/** The support page, carrying the player's handle so the donation goes to their account. */
const supportUrl = () => {
  const s = accountState()
  const handle = s.kind === 'signedIn' ? s.handle : null
  return `${ROUTES.support[locale()]}${handle ? `?u=${encodeURIComponent(handle)}` : ''}`
}

/**
 * "♥ Apoie o projeto" chip in the top-right corner of the menus before a run
 * (title and starter select), left of the account chip or the Poké Mart. It
 * opens the Apoiadores screen, and twinkles with a sparkle while a shiny
 * ticket waits for its pick; without accounts (no rewards to give) it opens
 * the support page in a new tab. Phones show just the heart. Returns a disposer.
 */
export const supportButton = (root: HTMLElement, open: () => void) => {
  const m = t()
  const waiting = accountsEnabled && pendingPicks(loadSave()).length > 0
  const label = waiting ? `${m.home.support} · ${m.supporters.banner}` : m.home.support
  const attrs = { class: waiting ? 'support-chip box waiting' : 'support-chip box', title: label, 'aria-label': label }
  const icon = h('img', { src: heartIcon(), alt: '' })
  const el = accountsEnabled
    ? h('button', { ...attrs, type: 'button', onclick: () => (playSfx('select'), later(open)) }, icon, h('span', {}, m.home.support), waiting && h('img', { class: 'support-sparkle', src: sparkleIcon(), alt: '' }))
    : h('a', { ...attrs, href: ROUTES.support[locale()], target: '_blank', rel: 'noopener' }, icon, h('span', {}, m.home.support))
  topRight(root).append(el)
  return () => el.remove()
}

/* ---------------- Spatial navigation ---------------- */

/**
 * Arrow keys over items laid out in rows (a grid of portraits and the buttons
 * under it): ← → step through the list, ↑ ↓ jump to the nearest item in the
 * row above or below, as laid out right now. Enter or Space picks.
 */
const spatialNav = (input: Input, items: HTMLElement[], activate: (i: number) => void, initial = 0) => {
  let index = Math.min(initial, items.length - 1)
  const focus = (i: number, sound = true) => {
    index = (i + items.length) % items.length
    items.forEach((el, j) => el.classList.toggle('selected', j === index))
    items[index]?.scrollIntoView({ block: 'nearest' })
    if (sound) playSfx('move')
  }
  const vertical = (dir: 1 | -1) => {
    const from = items[index]?.getBoundingClientRect()
    if (!from) return
    let best = -1
    let score = Infinity
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      const dy = (r.top - from.top) * dir
      if (dy <= 2) return
      const s = dy * 1000 + Math.abs(r.left + r.width / 2 - (from.left + from.width / 2))
      if (s < score) [score, best] = [s, i]
    })
    if (best >= 0) focus(best)
  }
  items.forEach((el, i) => el.addEventListener('click', () => (focus(i, false), activate(i))))
  focus(index, false)
  const off = input.onKey((key) => {
    if (key === 'ArrowLeft' || key === 'KeyA') focus(index - 1)
    else if (key === 'ArrowRight' || key === 'KeyD') focus(index + 1)
    else if (key === 'ArrowUp' || key === 'KeyW') vertical(-1)
    else if (key === 'ArrowDown' || key === 'KeyS') vertical(1)
    else if (key === 'Enter' || key === 'Space') activate(index)
  })
  return { off, focus, get index() { return index } }
}

/* ---------------- Pokémon grid ---------------- */

type Cell = { id: PlayableId | null; shiny: boolean }

/** A portrait to tap in a picker: the family's first stage, a Poké Ball for "none". */
const cellButton = (c: Cell, extra: Node | null = null) => {
  const name = c.id ? PLAYABLE[c.id].line[0].name : t().supporters.companionNone
  return h(
    'button',
    { class: 'pick-cell', type: 'button', title: name, 'aria-label': name },
    h('img', { src: c.id ? portraitUrl(PLAYABLE[c.id].line[0].dex, c.shiny) : pokeballIcon(), alt: '' }),
    extra,
  )
}

/**
 * A dialog to pick one Pokémon: sections of portraits and the footer's
 * buttons, under one spatial navigation. `pick` runs on a portrait; the
 * footer's actions run on their buttons. Returns the dialog's parts to redraw.
 */
const pickerDialog = (
  input: Input,
  opts: { title: string; intro: string; sections: { label: string; cells: { cell: Cell; el: HTMLElement }[] }[]; footer: Action[]; pick: (c: Cell) => void; initial?: number },
) => {
  const cells = opts.sections.flatMap((s) => s.cells)
  const buttons = opts.footer.map((a) => h('button', { class: 'btn' }, a.label))
  const items = [...cells.map((c) => c.el), ...buttons]
  const nav = spatialNav(input, items, (i) => {
    const cell = cells[i]
    if (cell) return (playSfx('select'), opts.pick(cell.cell))
    playSfx('select')
    later(opts.footer[i - cells.length]!.run)
  }, opts.initial)
  const box = h(
    'div',
    { class: 'dialog box pop supporters picker' },
    h('div', { class: 'dialog-title' }, opts.title),
    h('p', { class: 'account-line' }, opts.intro),
    h('div', { class: 'pick-scroll' }, ...opts.sections.flatMap((s) => (s.cells.length > 0 ? [h('h3', { class: 'pick-label' }, s.label), h('div', { class: 'pick-grid' }, ...s.cells.map((c) => c.el))] : []))),
    h('div', { class: 'buttons' }, ...buttons),
    hint(t().supporters.gridHintKeys, t().supporters.hintTouch),
  )
  return { box, nav, buttons }
}

/* ---------------- Sub-screens ---------------- */

type Back = () => void

/** A screen with its own keys that closes on Esc or Backspace, calling `back` after the key dispatch. */
const overlay = (root: HTMLElement, input: Input, back: Back) => {
  const el = h('div', { class: 'screen dim' })
  let off: (() => void) | null = null
  let closed = false
  const dispose = () => (off?.(), offKeys(), el.remove())
  const close = () => {
    if (closed) return
    closed = true
    playSfx('select')
    dispose()
    later(back)
  }
  const offKeys = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && close())
  root.append(el)
  return { el, close, dispose, setNav: (next: () => void) => (off?.(), (off = next)) }
}

/**
 * "Shiny à sua escolha": every Pokémon the ticket can become, starters then
 * egg families. Picking one spends the oldest ticket: an egg family plays its
 * hatching scene (shiny), a starter shows its shiny portrait.
 */
const shinyPicker = (root: HTMLElement, input: Input, actions: { play: (id: PlayableId) => void }, back: Back): Screen => {
  const m = t().supporters
  const o = overlay(root, input, back)
  let picked: PlayableId | null = null
  let sub: Screen | null = null

  const reveal = (id: PlayableId) => {
    const def = PLAYABLE[id]
    playSfx('shiny')
    playCry(cryUrl(def.line[0].dex), 0.5)
    const buttons = [h('button', { class: 'btn' }, m.play(def.name)), h('button', { class: 'btn' }, m.ok)]
    const nav = menu(input, buttons, (i) => (playSfx('select'), later(i === 0 ? () => (o.dispose(), actions.play(id)) : o.close)), { horizontal: true })
    o.setNav(nav.off)
    o.el.replaceChildren(
      h(
        'div',
        { class: 'dialog box pop supporters pick-reveal' },
        h('div', { class: 'portrait-wrap' }, h('img', { class: 'result-portrait', src: portraitUrl(def.line[0].dex, true), alt: '' }), h('img', { class: 'shiny-badge', src: sparkleIcon(), alt: 'Shiny' })),
        h('p', { class: 'hatch-text' }, rich(m.picked(def.line[0].name)), h('small', {}, m.pickedNote)),
        h('div', { class: 'buttons' }, ...buttons),
      ),
    )
  }

  const confirm = () => {
    const ticket = pendingPicks(loadSave())[0]
    const id = picked
    if (!ticket || !id) return
    const next = pickShiny(loadSave(), ticket.id, id)
    if (!next) return
    updateSave(() => next)
    void syncSave()
    if (!isHatchling(id)) return reveal(id)
    // An egg family hatches for it, shiny, like the Mystery Gift's shiny hatch. The picker goes away (keys included) while it plays.
    o.dispose()
    sub = hatchScene(root, input, { id, tier: HATCHLINGS[id].egg, shiny: true, duplicate: false, refund: 0 }, { play: () => (sub?.dispose(), actions.play(id)), done: () => (sub?.dispose(), later(back)) })
  }

  const draw = (initial = 0) => {
    const save = loadSave()
    const choices = shinyChoices(save)
    const section = (ids: PlayableId[]) =>
      ids.map((id) => {
        const el = cellButton({ id, shiny: true }, isHatchling(id) && !save.hatched[id] ? h('img', { class: 'pick-egg', src: eggIcon(HATCHLINGS[id].egg), alt: '' }) : null)
        el.classList.toggle('picked', id === picked)
        return { cell: { id, shiny: true }, el }
      })
    const footer: Action[] = [
      ...(choices.length > 0 ? [{ label: picked ? m.pickConfirm(PLAYABLE[picked].line[0].name) : m.pickNone, run: () => (picked ? confirm() : undefined) }] : []),
      { label: m.back, run: o.close },
    ]
    const { box, nav, buttons } = pickerDialog(input, {
      title: m.pickTitle,
      intro: choices.length > 0 ? m.pickIntro : m.allShiny,
      sections: [
        { label: m.starters, cells: section(choices.filter((id) => !isHatchling(id))) },
        { label: m.eggs, cells: section(choices.filter(isHatchling)) },
      ],
      footer,
      pick: (c) => {
        picked = c.id
        // Back on the confirm button, so Enter twice picks.
        draw(choices.length)
      },
      initial,
    })
    if (choices.length > 0) buttons[0]!.classList.toggle('confirm', picked !== null)
    o.setNav(nav.off)
    o.el.replaceChildren(box)
  }

  draw()
  // The hatching scene animates on the frame's tick, passed down from whoever shows the picker.
  return { el: o.el, tick: (time) => sub?.tick?.(time), dispose: () => (sub?.dispose(), o.dispose()), dim: 0.5 }
}

/** The companion: any Pokémon the save can play (shiny if owned so), or none. */
const companionPicker = (root: HTMLElement, input: Input, back: Back): Screen => {
  const m = t().supporters
  const o = overlay(root, input, back)
  const now = loadSave().companion
  let picked: PlayableId | null = now?.id ?? null
  let shiny = now?.shiny ?? false

  const draw = (initial?: number) => {
    const save = loadSave()
    const ids = PLAYABLE_IDS.filter((id) => canWalkWith(save, { id, shiny: false }))
    const cells = [null, ...ids].map((id) => {
      const el = cellButton({ id, shiny: id !== null && id === picked && shiny })
      el.classList.toggle('picked', id === picked)
      return { cell: { id, shiny: false }, el }
    })
    const canShiny = picked !== null && ownsShiny(save, picked)
    const footer: Action[] = [
      ...(canShiny ? [{ label: m.companionShiny(shiny), run: () => ((shiny = !shiny), draw(cells.length)) }] : []),
      {
        label: m.companionSave,
        run: () => {
          const companion = picked ? { id: picked, shiny: shiny && canShiny } : null
          updateSave((s) => ({ ...s, companion }))
          void syncSave()
          toast(root, companion ? m.companionSaved(PLAYABLE[companion.id].line[0].name) : m.companionOff, 2200)
          o.close()
        },
      },
      { label: m.back, run: o.close },
    ]
    const { box, nav } = pickerDialog(input, {
      title: m.companionTitle,
      intro: m.companionIntro,
      sections: [{ label: '', cells }],
      footer,
      pick: (c) => {
        picked = c.id
        shiny = picked !== null && ownsShiny(loadSave(), picked) && shiny
        draw(cells.length)
      },
      initial: initial ?? Math.max(0, cells.findIndex((c) => c.cell.id === picked)),
    })
    o.setNav(nav.off)
    o.el.replaceChildren(box)
  }

  draw()
  return { el: o.el, dispose: o.dispose, dim: 0.5 }
}

/** The poll: each option's votes; a supporter taps one to vote (and may change it). */
const pollScreen = (root: HTMLElement, input: Input, mine: SupporterStatus | null, back: Back): Screen => {
  const m = t().supporters
  const o = overlay(root, input, back)
  let choice: PollOptionId | null = mine?.vote ?? null
  const canVote = Boolean(mine?.tier)

  const frame = (body: Node[], rows: { el: HTMLElement; run: () => void }[]) => {
    const backButton = h('button', { class: 'btn' }, m.back)
    const all = [...rows, { el: backButton, run: o.close }]
    const nav = menu(input, all.map((r) => r.el), (i) => (playSfx('select'), later(all[i]!.run)), { initial: Math.max(0, POLL.options.findIndex((p) => p.id === choice)) })
    o.setNav(nav.off)
    o.el.replaceChildren(
      h('div', { class: 'dialog box pop supporters' }, h('div', { class: 'dialog-title' }, m.pollTitle), h('p', { class: 'account-line' }, m.pollIntro), ...body, h('div', { class: 'buttons' }, backButton), hint(m.hintKeys, m.hintTouch)),
    )
  }

  const show = (votes: Record<PollOptionId, number> | null) => {
    const total = votes ? Math.max(1, POLL.options.reduce((sum, p) => sum + votes[p.id], 0)) : 1
    const rows = POLL.options.map((p) => {
      const n = votes?.[p.id] ?? 0
      const el = h(
        'button',
        { class: p.id === choice ? 'poll-row mine' : 'poll-row', type: 'button', disabled: !canVote },
        h('img', { src: portraitUrl(p.dex), alt: '' }),
        h('span', { class: 'poll-name' }, p.name, p.id === choice && h('span', { class: 'tag tag-new' }, m.yourVote)),
        h('span', { class: 'progress' }, h('span', { style: `width:${Math.round((n / total) * 100)}%` })),
        h('small', {}, votes ? m.votes(n) : '—'),
      )
      return {
        el,
        run: async () => {
          if (!canVote) return
          const next = await vote(p.id)
          if (!next || next === 'denied') return toast(root, m.offline, 2200)
          choice = p.id
          playSfx('unlock')
          toast(root, m.voted(p.name), 2000)
          show(next.votes)
        },
      }
    })
    frame([...(canVote ? [] : [h('p', { class: 'account-line account-note' }, m.voteOnly)]), h('div', { class: 'poll-rows' }, ...rows.map((r) => r.el))], canVote ? rows : [])
  }

  show(null)
  void fetchPoll().then((p) => o.el.isConnected && (p ? show(p.votes) : toast(root, m.offline, 2200)))
  return { el: o.el, dispose: o.dispose, dim: 0.5 }
}

/** Redeems a donation's code for the signed-in account. `redeemed` runs once one goes through. */
const codeScreen = (root: HTMLElement, input: Input, redeemed: () => void, back: Back): Screen => {
  const m = t().supporters
  const field = h('input', { class: 'field-input', type: 'text', maxlength: 14, autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', placeholder: 'PS-XXXX-XXXX', enterkeyhint: 'done' })
  const message = h('p', { class: 'field-message' }, m.codeIntro)
  const submit = h('button', { class: 'btn confirm', type: 'submit' }, m.redeem)
  const cancel = h('button', { class: 'btn', type: 'button' }, m.back)
  let busy = false
  const say = (text: string, error = false) => {
    message.textContent = text
    message.classList.toggle('error', error)
  }
  const form = h(
    'form',
    {
      class: 'dialog box pop supporters',
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault()
        if (busy) return
        const code = parseCode(field.value)
        if (!code) return (playSfx('hurt'), say(m.codeErrors.format, true))
        busy = true
        submit.textContent = m.redeeming
        const result = await redeemCode(code)
        busy = false
        submit.textContent = m.redeem
        if (!result.ok) return (playSfx('hurt'), say(m.codeErrors[result.reason], true))
        playSfx('unlock')
        say(m.redeemed)
        field.value = ''
        void syncSave()
        redeemed()
      },
    },
    h('div', { class: 'dialog-title' }, m.codeTitle),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, m.codeField), h('span', { class: 'field-box' }, field)),
    message,
    h('div', { class: 'buttons' }, submit, cancel),
  )
  const el = h('div', { class: 'screen dim' }, form)
  let closed = false
  const dispose = () => (offKeys(), el.remove())
  const close = () => {
    if (closed) return
    closed = true
    playSfx('select')
    dispose()
    later(back)
  }
  cancel.addEventListener('click', close)
  // Inside the field the game's keys are off (see `createInput`), so Esc is caught here.
  form.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  const offKeys = input.onKey((key) => key === 'Escape' && close())
  root.append(el)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) field.focus()
  return { el, dispose, dim: 0.5 }
}

/** The wall: every supporter who shows themselves, oldest first; tapping one opens their profile. */
const wallScreen = (root: HTMLElement, input: Input, back: Back): Screen => {
  const m = t().supporters
  const o = overlay(root, input, back)
  let sub: Screen | null = null

  const frame = (body: Node[], rows: { el: HTMLElement; handle: string }[]) => {
    const backButton = h('button', { class: 'btn' }, m.back)
    const all = [...rows.map((r) => r.el), backButton]
    const nav = menu(input, all, (i) => {
      playSfx('select')
      const row = rows[i]
      if (!row) return later(o.close)
      later(() => {
        o.setNav(() => {})
        o.el.classList.add('hidden')
        sub = profileScreen(root, input, row.handle, () => {
          sub = null
          o.el.classList.remove('hidden')
          o.setNav(nav.off)
          void load()
        })
      })
    })
    o.setNav(nav.off)
    o.el.replaceChildren(
      h('div', { class: 'dialog box pop supporters' }, h('div', { class: 'dialog-title' }, m.wallTitle), h('p', { class: 'account-line' }, m.wallIntro), ...body, h('div', { class: 'buttons' }, backButton), hint(m.hintKeys, m.hintTouch)),
    )
  }

  const load = async () => {
    frame([h('p', { class: 'profile-note blink' }, m.loading)], [])
    const wall = await fetchWall()
    if (!o.el.isConnected || sub) return
    if (!wall) return frame([h('p', { class: 'profile-note' }, m.offline)], [])
    const rows = wall.map((e) => ({
      handle: e.handle,
      el: h('button', { class: 'wall-row', type: 'button' }, h('img', { src: supporterIcon(e.tier), alt: m.badge(e.tier) }), h('b', {}, e.name), h('small', {}, `@${e.handle}`)),
    }))
    frame(rows.length > 0 ? [h('div', { class: 'wall-rows' }, ...rows.map((r) => r.el))] : [h('p', { class: 'profile-note' }, m.wallEmpty)], rows)
  }

  void load()
  return { el: o.el, dispose: () => (sub?.dispose(), o.dispose()), dim: 0.5 }
}

/* ---------------- The hub ---------------- */

/** One line of what donating brings: an icon and light markup. */
const perk = (src: string, text: string) => h('li', {}, h('img', { src, alt: '' }), rich(text))

const perks = () => {
  const p = t().supporters.perks
  return h(
    'ul',
    { class: 'supporter-perks' },
    perk(frameIcon('supporter'), p.title),
    perk(heartIcon(), p.badge),
    perk(sparkleIcon(), p.shiny),
    perk(pokeballIcon(), p.companion),
    perk(medalIcon('gold'), p.wall),
    perk(eggIcon('rare'), p.vote),
    perk(supporterIcon('gold'), p.gold),
  )
}

export type SupportersActions = {
  /** Starts a run with a Pokémon just picked shiny. */
  play: (id: PlayableId) => void
  onClose: () => void
}

/**
 * The Apoiadores screen (the heart chip on the title and the starter select):
 * the perks, "Doar" (the support page in a new tab, with the player's handle),
 * and for an account its standing and what it can do: pick its shiny (one per
 * ticket), choose a companion, vote, see the wall, redeem a code, show or hide
 * its badge. `open: 'pick'` goes straight to the shiny picker while a ticket waits (the heart chip twinkles then).
 */
export const supportersScreen = (root: HTMLElement, input: Input, actions: SupportersActions, open: 'pick' | null = null): Screen => {
  const el = h('div', { class: 'screen dim' })
  let nav: ReturnType<typeof menu> | null = null
  let sub: Screen | null = null
  /** The account's standing: undefined while it loads, null when the API can't say. */
  let status: SupporterStatus | null | undefined
  let closed = false

  const openSub = (make: (back: Back) => Screen) => {
    nav?.off()
    el.classList.add('hidden')
    sub = make(() => {
      sub = null
      el.classList.remove('hidden')
      build(false)
    })
  }

  const loadStatus = () => {
    const s = accountState()
    if (s.kind !== 'signedIn') return void (status = null)
    status = undefined
    void fetchSupporterStatus().then((next) => {
      status = next
      if (!closed) build(false)
    })
  }

  /** What the account part says right now. */
  const standing = (): Node | null => {
    const m = t().supporters
    const s = accountState()
    const line = (text: string, cls = '') => h('p', { class: `account-line ${cls}` }, text)
    if (!accountsEnabled) return null
    if (s.kind !== 'signedIn') return line(m.guest, 'account-note')
    if (s.handle === null) return line(m.noHandle, 'account-note')
    if (status === undefined) return line(m.loading, 'blink')
    if (status?.tier && status.since) return h('p', { class: 'account-line supporter-since' }, h('img', { src: supporterIcon(status.tier), alt: '' }), rich(m.since(status.tier, longDay(status.since))))
    return line(status === null && isSupporter(loadSave()) ? m.offline : m.none, 'account-note')
  }

  const build = (opening: boolean) => {
    if (sub || closed) return
    const m = t().supporters
    const s = accountState()
    const save = loadSave()
    const pending = pendingPicks(save).length
    const signedIn = s.kind === 'signedIn'
    const all: Action[] = [
      { label: `♥ ${m.donate}`, run: () => void window.open(supportUrl(), '_blank', 'noopener') },
      ...(accountsEnabled && s.kind === 'guest' ? [{ label: m.signIn, run: () => void signIn() }] : []),
      ...(signedIn && s.handle === null ? [{ label: m.createProfile, run: () => openSub((back) => profileEditor(root, input, () => back())) }] : []),
      ...(pending > 0 ? [{ label: m.pick(pending), run: () => openSub((back) => shinyPicker(root, input, { play: (id) => (dispose(), actions.play(id)) }, back)) }] : []),
      ...(isSupporter(save) ? [{ label: m.companion, run: () => openSub((back) => companionPicker(root, input, back)) }] : []),
      { label: m.vote, run: () => openSub((back) => pollScreen(root, input, status ?? null, back)) },
      { label: m.wall, run: () => openSub((back) => wallScreen(root, input, back)) },
      ...(signedIn ? [{ label: m.code, run: () => openSub((back) => codeScreen(root, input, loadStatus, back)) }] : []),
      ...(status?.tier
        ? [
            {
              label: m.show(status.public),
              run: async () => {
                const next = await setSupporterPublic(!status?.public)
                if (!next) return toast(root, m.offline, 2200)
                status = next
                build(false)
              },
            },
          ]
        : []),
      { label: m.back, run: close },
    ]
    const buttons = all.map((a) => h('button', { class: 'btn' }, a.label))
    if (pending > 0) buttons[all.findIndex((a) => a.label === m.pick(pending))]?.classList.add('glow')
    nav?.off()
    nav = menu(input, buttons, (i) => (playSfx('select'), later(all[i]!.run)), { initial: Math.min(nav?.index ?? 0, buttons.length - 1) })
    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop supporters' : 'dialog box supporters' },
        h('div', { class: 'dialog-title' }, h('img', { class: 'title-heart', src: heartIcon(), alt: '' }), m.title),
        h('p', { class: 'account-line' }, m.lead),
        standing(),
        h('h3', { class: 'pick-label' }, m.perksTitle),
        perks(),
        h('div', { class: 'buttons supporter-buttons' }, ...buttons),
        hint(m.hintKeys, m.hintTouch),
      ),
    )
  }

  const offState = onAccountChange(() => (loadStatus(), build(false)))
  // A redeemed code's gifts land on the next sync: the shiny ticket and the companion show up then.
  const offGifts = onGifts(() => build(false))
  const offKeys = input.onKey((key) => !sub && (key === 'Escape' || key === 'Backspace') && close())

  function dispose() {
    closed = true
    sub?.dispose()
    nav?.off()
    offState()
    offGifts()
    offKeys()
    el.remove()
  }

  function close() {
    if (closed) return
    playSfx('select')
    dispose()
    later(actions.onClose)
  }

  root.append(el)
  loadStatus()
  build(true)
  if (open === 'pick' && pendingPicks(loadSave()).length > 0) openSub((back) => shinyPicker(root, input, { play: (id) => (dispose(), actions.play(id)) }, back))
  return { el, tick: (time) => sub?.tick?.(time), dispose, dim: 0.5 }
}

/**
 * The victory screen's thanks: a line of supporters' names, a different
 * handful each time (at most `SUPPORTER.credits`). It fills in once the wall
 * comes back and stays empty offline or before the first supporter.
 */
export const creditsLine = () => {
  const el = h('p', { class: 'supporter-credits hidden' })
  void fetchWall().then((wall) => {
    if (!wall || wall.length === 0) return
    const names = [...wall].sort(() => Math.random() - 0.5).slice(0, SUPPORTER.credits).map((e) => e.name)
    el.replaceChildren(h('img', { src: heartIcon(), alt: '' }), h('small', {}, t().supporters.credits), h('span', {}, names.join(' · ')))
    el.classList.remove('hidden')
  })
  return el
}
