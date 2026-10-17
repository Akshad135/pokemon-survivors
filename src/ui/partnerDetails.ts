import { playSfx } from '../engine/audio'
import { PLAYABLE, type PlayableId } from '../data/hatchlings'
import type { PlayableDef } from '../data/starters'
import { TYPE_COLORS } from '../data/types'
import { MEGA, MEGAS, megasOf, type MegaId } from '../data/megas'
import { starterStats } from '../game/leveling'
import { MOVES, type MoveDef, type MoveId } from '../game/moves'
import { resolveSpecial } from '../game/special'
import { megaIcon } from '../render/megaFx'
import { moveIcon, sparkleIcon } from '../render/art'
import { specialIcon } from '../render/specialFx'
import { portraitUrl } from '../render/sprites'
import { t } from '../i18n'
import { boundKey } from './controls'
import { h } from './dom'
import { tabStrip } from './shell'
import { STAT_BARS, statRatio } from './statBars'
import { typeBadge } from './screens'

/**
 * What the partner select shows about a playable Pokémon: stat bars, the
 * evolution line, the Normal/Shiny pick, and the details sheet with
 * everything else (all stats, the special, every move, the Megas).
 */

const moveRow = (id: MoveId, signature: boolean) => {
  const def: MoveDef = MOVES[id]
  return h(
    'div',
    { class: signature ? 'move-row signature' : 'move-row' },
    h('img', { src: moveIcon(id), alt: '' }),
    h('div', { class: 'move-text' }, h('div', { class: 'move-name' }, def.name, signature && h('span', { class: 'tag tag-new' }, t().title.signature)), h('div', { class: 'move-desc' }, t().moves[id].description)),
    typeBadge(def.type),
  )
}

/** The manual special (Space / round button): base move, upgraded (or swapped, for Aegislash) at the final stage. */
const specialRow = (id: PlayableId) => {
  const first = resolveSpecial(id, 0)
  const last = resolveSpecial(id, PLAYABLE[id].line.length - 1)
  const desc = first.id === last.id ? t().specials[first.id] : `${t().specials[first.id]} ${last.tier.name}: ${t().specials[last.id]}`
  return h(
    'div',
    { class: 'move-row signature' },
    h('img', { src: specialIcon(first.id), alt: '' }),
    h('div', { class: 'move-text' }, h('div', { class: 'move-name' }, `${first.tier.name} → ${last.tier.name}`), h('div', { class: 'move-desc' }, desc)),
    typeBadge(first.def.type),
  )
}

/** One of a line's Mega Evolutions: how it's earned, how long it lasts, its ability and what it does. */
const megaRow = (id: MegaId) => {
  const def = MEGAS[id]
  return h(
    'div',
    { class: 'move-row signature' },
    h('img', { src: megaIcon(), alt: '' }),
    h(
      'div',
      { class: 'move-text' },
      h('div', { class: 'move-name' }, `${def.name} · ${def.ability}`),
      h('div', { class: 'move-desc' }, `${t().mega.how(def.stone, MEGA.duration, MEGA.recharge)} ${t().mega.effects[id]}`),
    ),
  )
}

/** Base (first stage) and evolved (final stage) bars of the first `count` stats (four on the partner panel, all of them in the details). */
export const statBars = (id: PlayableId, count: number = STAT_BARS.length) => {
  const m = t()
  const base = starterStats(id, 0)
  const final = starterStats(id, PLAYABLE[id].line.length - 1)
  return h(
    'div',
    { class: 'stat-bars' },
    ...STAT_BARS.slice(0, count).map((b) =>
      h(
        'div',
        { class: 'stat-bar' },
        h('span', { class: 'stat-label' }, m.stats[b.label]),
        h(
          'div',
          { class: 'bar' },
          h('div', { class: 'bar-final', style: `width:${statRatio(b.get(final), b.min, b.max) * 100}%` }),
          h('div', { class: 'bar-base', style: `width:${statRatio(b.get(base), b.min, b.max) * 100}%` }),
        ),
        h('b', {}, b.fmt(b.get(base))),
      ),
    ),
  )
}

/** The "base / evolved" key of the stat bars. */
const legend = () => {
  const m = t().title
  return h('span', { class: 'legend' }, h('i', { class: 'legend-base' }), `${m.legendBase} `, h('i', { class: 'legend-final' }), m.legendFinal)
}

/** The evolution line: a portrait per stage and the level between them; tapping a stage previews it (`onStage`). */
export const evoLine = (id: PlayableId, stage: number, onStage: (stage: number) => void) => {
  const s: PlayableDef = PLAYABLE[id]
  return h(
    'div',
    { class: 'evo-line' },
    ...s.line.flatMap((st, i) => [
      i > 0 && h('span', { class: 'evo-arrow' }, t().level(s.line[i - 1]!.evolveAt!), h('br'), '▶'),
      h(
        'button',
        { class: i === stage ? 'evo-stage selected' : 'evo-stage', type: 'button', onclick: () => onStage(i), title: st.name },
        h('img', { src: portraitUrl(st.dex), alt: st.name }),
        h('span', { class: 'evo-name' }, st.name),
        h('span', { class: 'evo-types' }, ...st.types.map((type) => h('i', { style: `--type:${TYPE_COLORS[type]}`, title: type }))),
      ),
    ]),
  )
}

/**
 * Normal / Shiny, for a Pokémon whose shiny the player rolled once (`Z`
 * flips it). The screen saves the pick right away, so the next run plays it.
 */
export const shinyPicker = (shiny: boolean, set: (shiny: boolean) => void) => {
  const m = t().title
  const option = (value: boolean, label: Node | string) =>
    h('button', { class: value === shiny ? 'shiny-option selected' : 'shiny-option', type: 'button', role: 'radio', 'aria-checked': String(value === shiny), onclick: () => set(value) }, label)
  return h(
    'div',
    { class: 'shiny-picker', role: 'radiogroup', 'aria-label': m.shinyPick },
    option(false, m.normal),
    option(true, h('span', {}, h('img', { src: sparkleIcon(), alt: '' }), m.shiny)),
    h('span', { class: 'key-hint' }, 'Z'),
  )
}

const section = (label: string, aside?: Node | string) => h('div', { class: 'inspect-section' }, label, aside && h('span', { class: 'legend' }, aside))

type SheetTab = 'status' | 'moves' | 'mega'

type SheetOpts = {
  id: PlayableId
  stage: number
  shiny: boolean
  /** A stage tapped in the sheet's evolution line: the partner panel previews it too. */
  onStage: (stage: number) => void
  /** The sheet's own start button: the screen's start, already colored for the difficulty (`go`). */
  go: HTMLButtonElement
  onClose: () => void
}

/**
 * Everything the old inspect panel had, on demand: a bottom sheet on phones,
 * a dialog on wider screens (CSS decides), with Status / Moves / Mega tabs
 * (no Mega tab for lines without one) and a start button of its own.
 * `onKey` takes the screen's keys while it's open and says whether it used
 * them: Esc/Backspace close, ← → Tab Q E switch tabs, ↑ ↓ scroll, Enter starts.
 */
export const detailsSheet = (opts: SheetOpts) => {
  const m = t()
  const { id, shiny, go } = opts
  let stage = opts.stage
  const megas = megasOf(id)
  const tabs: readonly SheetTab[] = megas.length > 0 ? ['status', 'moves', 'mega'] : ['status', 'moves']
  let tab = 0

  const head = h('div', { class: 'partner-sheet-id' })
  const body = h('div', { class: 'partner-sheet-body' })
  const strip = tabStrip(
    tabs.map((k) => m.partner.tabs[k]),
    tab,
    (i) => setTab(i),
  )
  strip.el.classList.add('partner-sheet-tabs')

  const render = () => {
    const form = PLAYABLE[id].line[stage]!
    head.replaceChildren(
      h('img', { class: 'partner-sheet-portrait', src: portraitUrl(form.dex, shiny), alt: '' }),
      h('div', {}, h('div', { class: 'partner-sheet-name' }, form.name), h('div', { class: 'types' }, ...form.types.map(typeBadge))),
    )
    const k = tabs[tab]!
    body.replaceChildren(
      ...(k === 'status'
        ? [
            section(m.title.statsSection, legend()),
            statBars(id),
            section(m.title.evolution),
            evoLine(id, stage, (i) => {
              stage = i
              playSfx('move')
              opts.onStage(i)
              render()
            }),
            section(m.title.special, boundKey('special')),
            specialRow(id),
          ]
        : k === 'moves'
          ? [section(m.title.moves), h('div', { class: 'move-list' }, ...PLAYABLE[id].learnset.map((mv) => moveRow(mv, mv === PLAYABLE[id].signature)))]
          : [section(megas.length > 1 ? m.mega.sectionTwo : m.mega.section, boundKey('mega')), ...megas.map(megaRow)]),
    )
    body.scrollTop = 0
  }

  const setTab = (i: number) => {
    const next = (i + tabs.length) % tabs.length
    if (next === tab) return
    tab = next
    playSfx('move')
    strip.set(tab)
    render()
  }

  const close = h(
    'button',
    { class: 'shell-btn shell-icon box partner-sheet-close', type: 'button', 'aria-label': m.partner.close, title: m.partner.close, onclick: () => opts.onClose() },
    h('span', { 'aria-hidden': 'true' }, '✕'),
    h('span', { class: 'key-hint' }, 'ESC'),
  )

  const sheet = h(
    'section',
    { class: 'partner-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': PLAYABLE[id].name },
    h('div', { class: 'partner-sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'partner-sheet-head' }, head, close),
    strip.el,
    body,
    go,
  )
  sheet.style.setProperty('--accent', PLAYABLE[id].color)
  // The scrim closes it; taps inside the sheet stay inside.
  const el = h('div', { class: 'partner-sheet-scrim', onclick: (e: Event) => e.target === e.currentTarget && opts.onClose() }, sheet)
  render()

  const onKey = (key: string) => {
    if (key === 'Escape' || key === 'Backspace') opts.onClose()
    else if (key === 'ArrowLeft' || key === 'KeyA' || key === 'KeyQ') setTab(tab - 1)
    else if (key === 'ArrowRight' || key === 'KeyD' || key === 'KeyE' || key === 'Tab') setTab(tab + 1)
    else if (key === 'ArrowUp' || key === 'KeyW') body.scrollBy({ top: -48 })
    else if (key === 'ArrowDown' || key === 'KeyS') body.scrollBy({ top: 48 })
    else if (key === 'Enter' || key === 'Space') go.click()
    else return false
    return true
  }

  return { el, onKey, go }
}
