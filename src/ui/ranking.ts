import { accountState } from '../account'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { formatTime } from '../engine/math'
import { HATCHLING_IDS, PLAYABLE, type PlayableId } from '../data/hatchlings'
import { REGIONS } from '../data/starters'
import { DIFFICULTY_IDS, type Difficulty } from '../game/difficulty'
import { BOARD_PERIODS, isPlayable, type Board, type BoardEntry, type BoardPeriod } from '../game/ranking'
import { fetchBoard, type BoardFilter, type RankOutcome } from '../ranking'
import { t } from '../i18n'
import { h, later } from './dom'
import { profileScreen, runForm, runPortrait } from './profile'
import { hint, menu, type Screen } from './screens'

const step = <T>(list: readonly T[], at: T, by: number) => list[(list.indexOf(at) + by + list.length) % list.length]!

/** One player's line: position, Pokémon, name and handle, time. */
const entryRow = (e: BoardEntry, me: boolean) =>
  h(
    'button',
    { class: `rank-row${me ? ' me' : ''}${e.rank <= 3 ? ` top${e.rank}` : ''}` },
    h('span', { class: 'rank-pos' }, `#${e.rank}`),
    h('img', { src: runPortrait(e.starter, e.stage), alt: runForm(e.starter, e.stage).name, title: runForm(e.starter, e.stage).name }),
    h('span', { class: 'rank-who' }, h('b', {}, e.name), h('small', {}, `@${e.handle}`, me && ` · ${t().ranking.you}`)),
    h('span', { class: 'rank-time' }, h('b', {}, formatTime(e.time)), h('small', {}, t().ranking.outcomes[e.outcome])),
  )

/** The Pokémon filter: every starter by region, then the egg families. */
const pokemonSelect = (value: PlayableId | null, onPick: (id: PlayableId | null) => void) => {
  const m = t().ranking
  const option = (id: PlayableId) => h('option', { value: id, selected: id === value }, PLAYABLE[id].name)
  const select = h(
    'select',
    { class: 'rank-select', 'aria-label': m.pokemon },
    h('option', { value: '' }, m.allPokemon),
    ...REGIONS.map((r) => h('optgroup', { label: r.name }, ...r.starters.map(option))),
    h('optgroup', { label: m.eggGroup }, ...HATCHLING_IDS.map(option)),
  )
  select.addEventListener('change', () => {
    // Back to the game's keys: the arrows move through the board again.
    select.blur()
    onPick(isPlayable(select.value) ? select.value : null)
  })
  return select
}

/**
 * The boards: one per difficulty, each by day, week and all time, every player
 * once with their best run. Filters by Pokémon and by friends (who the player
 * follows, plus them). The player's own line stays in sight below the top
 * when they're further down. A row opens that trainer's profile over the board.
 *
 * Keys: ↑/↓ rows and buttons, ←/→ period, Q/E difficulty, F friends, Enter
 * opens, Esc goes back. `onClose` runs after the key dispatch.
 */
export const rankingScreen = (root: HTMLElement, input: Input, onClose: () => void, opts: { difficulty?: Difficulty } = {}): Screen => {
  const signedIn = () => accountState().kind === 'signedIn'
  const filter: BoardFilter = { difficulty: opts.difficulty ?? 'normal', period: 'day', starter: null, friends: false }
  const el = h('div', { class: 'screen dim rank-screen' })
  let nav: ReturnType<typeof menu> | null = null
  /** A profile open over the board. */
  let sub: Screen | null = null
  /** The board on screen: loading, unreachable, or the answer. */
  let board: Board | 'loading' | 'offline' = 'loading'
  let request = 0
  let closed = false
  let opening = true

  const openProfile = (handle: string) => {
    nav?.off()
    el.classList.add('hidden')
    sub = profileScreen(root, input, handle, () => {
      sub = null
      el.classList.remove('hidden')
      // Following someone there changes the friends board.
      void load()
    })
  }

  const myHandle = () => {
    const s = accountState()
    return s.kind === 'signedIn' ? s.handle : null
  }

  const render = () => {
    const m = t().ranking
    const tab = (label: string, selected: boolean, onclick: () => void) => h('button', { class: selected ? 'region-tab rank-tab selected' : 'region-tab rank-tab', onclick }, label)
    const difficulties = DIFFICULTY_IDS.map((d) => tab(t().difficulty.names[d], d === filter.difficulty, () => set({ difficulty: d })))
    const periods = BOARD_PERIODS.map((p) => tab(m.periods[p], p === filter.period, () => set({ period: p })))
    const scope = [tab(m.everyone, !filter.friends, () => set({ friends: false })), tab(m.friends, filter.friends, () => set({ friends: true }))]

    const rows: { el: HTMLElement; handle: string }[] = []
    const status = (text: string, cls = '') => h('p', { class: `rank-status ${cls}` }, text)
    let list: Node[]
    if (filter.friends && !signedIn()) list = [status(m.friendsGuest)]
    else if (board === 'loading') list = [status(m.loading, 'blink')]
    else if (board === 'offline') list = [status(m.offline)]
    else {
      const mine = board.me
      const top = board.entries.map((e) => ({ el: entryRow(e, e.handle === mine?.handle), handle: e.handle }))
      const below = mine && !board.entries.some((e) => e.handle === mine.handle) ? [{ el: entryRow(mine, true), handle: mine.handle }] : []
      rows.push(...top, ...below)
      list =
        rows.length === 0
          ? [status(filter.friends ? m.emptyFriends : m.empty)]
          : [...top.map((r) => r.el), ...(below.length > 0 ? [h('div', { class: 'rank-gap', 'aria-hidden': 'true' }, '⋮'), below[0]!.el] : [])]
    }

    const handle = myHandle()
    const actions = [
      ...rows.map((r) => () => openProfile(r.handle)),
      ...(board === 'offline' ? [() => void load()] : []),
      ...(handle ? [() => openProfile(handle)] : []),
      close,
    ]
    const footer = [
      ...(board === 'offline' ? [h('button', { class: 'btn' }, m.retry)] : []),
      ...(handle ? [h('button', { class: 'btn' }, m.myProfile)] : []),
      h('button', { class: 'btn' }, m.back),
    ]
    const buttons = [...rows.map((r) => r.el), ...footer]
    // Keep the cursor on the player's own row, else the top, across reloads.
    const meAt = rows.findIndex((r) => r.handle === handle)
    nav?.off()
    nav = menu(input, buttons, (i) => (playSfx('select'), later(actions[i]!)), { initial: Math.max(0, meAt) })

    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop rank' : 'dialog box rank' },
        h('div', { class: 'dialog-title' }, m.title),
        h('div', { class: 'region-tabs rank-tabs', role: 'tablist' }, ...difficulties),
        h(
          'div',
          { class: 'rank-filters' },
          h('div', { class: 'region-tabs rank-tabs', role: 'tablist' }, ...periods),
          h('div', { class: 'region-tabs rank-tabs', role: 'tablist' }, ...scope),
          pokemonSelect(filter.starter, (starter) => set({ starter })),
        ),
        h('div', { class: 'rank-list' }, ...list),
        filter.period !== 'all' && h('p', { class: 'rank-resets' }, m.resets),
        h('div', { class: 'buttons' }, ...footer),
        hint(m.hintKeys, m.hintTouch),
      ),
    )
    opening = false
    buttons[nav.index]?.scrollIntoView({ block: 'nearest' })
  }

  const load = async () => {
    const id = ++request
    board = 'loading'
    render()
    if (filter.friends && !signedIn()) return
    const next = await fetchBoard(filter)
    if (id !== request || closed) return
    board = next ?? 'offline'
    render()
  }

  const set = (change: Partial<BoardFilter>) => {
    const next = { ...filter, ...change }
    if (next.difficulty === filter.difficulty && next.period === filter.period && next.starter === filter.starter && next.friends === filter.friends) return
    Object.assign(filter, next)
    playSfx('move')
    void load()
  }

  const offKeys = input.onKey((key) => {
    if (sub || closed) return
    if (key === 'Escape' || key === 'Backspace') return close()
    if (key === 'ArrowLeft' || key === 'KeyA' || key === 'ArrowRight' || key === 'KeyD') {
      return set({ period: step<BoardPeriod>(BOARD_PERIODS, filter.period, key === 'ArrowLeft' || key === 'KeyA' ? -1 : 1) })
    }
    if (key === 'KeyQ' || key === 'PageUp') return set({ difficulty: step(DIFFICULTY_IDS, filter.difficulty, -1) })
    if (key === 'KeyE' || key === 'PageDown') return set({ difficulty: step(DIFFICULTY_IDS, filter.difficulty, 1) })
    if (key === 'KeyF') return set({ friends: !filter.friends })
    // `menu` moved the cursor: keep it in view in the scrolling list.
    if (nav) el.querySelectorAll('.rank-row, .buttons .btn')[nav.index]?.scrollIntoView({ block: 'nearest' })
  })

  const dispose = () => {
    request++
    sub?.dispose()
    nav?.off()
    offKeys()
    el.remove()
  }

  function close() {
    if (closed) return
    closed = true
    playSfx('select')
    dispose()
    later(onClose)
  }

  root.append(el)
  void load()
  return { el, dispose, dim: 0.5 }
}

/** What the results screen says about the ranking, by what became of the run. */
const outcomeLine = (o: RankOutcome) => {
  const m = t().ranking
  if (o.kind !== 'ranked') return h('span', {}, m[o.kind])
  const places = BOARD_PERIODS.flatMap((p) => {
    const rank = o.ranks[p]
    return rank === null ? [] : [h('span', { class: 'rank-place' }, h('b', {}, `#${rank}`), ` ${m.place[p]}`)]
  })
  return places.length > 0 ? h('span', { class: 'rank-places' }, ...places) : h('span', {}, m.noHandle)
}

/**
 * The results screen's ranking line: the player's position today, this week
 * and all time on the run's difficulty once the API answers, or why the run
 * isn't there (guest, offline, no profile yet). Null without a ranking.
 */
export const rankPanel = (outcome: Promise<RankOutcome> | null) => {
  const m = t().ranking
  const line = h('span', {}, outcome ? m.sending : m.guest)
  const el = h('div', { class: 'rank-panel' }, h('b', { class: 'rank-panel-title' }, m.title), line)
  void outcome?.then((o) => line.replaceChildren(outcomeLine(o)))
  return el
}
