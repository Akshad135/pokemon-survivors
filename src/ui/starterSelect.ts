import { blitCentered, context2d } from '../engine/pixelart'
import { playCry, playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { HATCHLING_IDS, HATCHLINGS, isHatchling, PLAYABLE, type HatchlingId, type PlayableId } from '../data/hatchlings'
import { REGIONS, type PlayableDef, type Region } from '../data/starters'
import { TYPE_COLORS } from '../data/types'
import { DIFFICULTY_IDS, type Difficulty } from '../game/difficulty'
import { EGGS, isReady, isUnlocked } from '../game/eggs'
import { armItem, BAG_ITEM_IDS, BAG_ITEMS, bagCount, type Bag, type BagItem } from '../game/bag'
import { pickShinyStarter, type ShinyStarters } from '../game/shinyStarters'
import { starterStats } from '../game/leveling'
import { MOVES, type MoveDef, type MoveId } from '../game/moves'
import { resolveSpecial } from '../game/special'
import { MEGA, MEGAS, megasOf, type MegaId } from '../data/megas'
import { megaIcon } from '../render/megaFx'
import { bagIcon, eggIcon, moveIcon, PICKUPS, sparkleIcon } from '../render/art'
import { specialIcon } from '../render/specialFx'
import { cryUrl, drawPokemon, loadAll, loadedSprites, loadSpecies, portraitUrl } from '../render/sprites'
import { t } from '../i18n'
import { h, later, rich } from './dom'
import { loadSave, updateSave } from './save'
import { STAT_BARS, statRatio } from './statBars'
import { hint, typeBadge, type Screen } from './screens'

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

/**
 * Normal / Shiny, for a Pokémon whose shiny the player rolled once (`Z`
 * flips it). The pick is saved right away, so the next run plays it.
 */
const shinyPicker = (shiny: boolean, set: (shiny: boolean) => void) => {
  const m = t().title
  const option = (value: boolean, label: Node | string) =>
    h('button', { class: value === shiny ? 'shiny-option selected' : 'shiny-option', role: 'radio', 'aria-checked': String(value === shiny), onclick: () => set(value) }, label)
  return h(
    'div',
    { class: 'shiny-picker', role: 'radiogroup', 'aria-label': m.shinyPick },
    option(false, m.normal),
    option(true, h('span', {}, h('img', { src: sparkleIcon(), alt: '' }), m.shiny)),
    h('span', { class: 'key-hint' }, 'Z'),
  )
}

/** Detailed sheet of a playable Pokémon: sprite, types, stat bars, evolution line and every move it can learn. `picker`: its Normal/Shiny pick, when unlocked. */
const inspectPanel = (id: PlayableId, stage: number, onStage: (stage: number) => void, sprite: HTMLCanvasElement, picker: HTMLElement | null) => {
  const m = t()
  const s: PlayableDef = PLAYABLE[id]
  const form = s.line[stage]!
  const base = starterStats(id, 0)
  const final = starterStats(id, s.line.length - 1)

  const bars = STAT_BARS.map((b) =>
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
  )

  const megas = megasOf(id)
  const evo = s.line.flatMap((st, i) => [
    i > 0 && h('span', { class: 'evo-arrow' }, m.level(s.line[i - 1]!.evolveAt!), h('br'), '▶'),
    h(
      'button',
      { class: i === stage ? 'evo-stage selected' : 'evo-stage', onclick: () => onStage(i), title: st.name },
      h('img', { src: portraitUrl(st.dex), alt: st.name }),
      h('span', { class: 'evo-name' }, st.name),
      h('span', { class: 'evo-types' }, ...st.types.map((t) => h('i', { style: `--type:${TYPE_COLORS[t]}`, title: t }))),
    ),
  ])

  return h(
    'div',
    { class: 'inspect-body' },
    h(
      'div',
      { class: 'inspect-head' },
      sprite,
      h(
        'div',
        { class: 'inspect-id' },
        h('div', { class: 'inspect-name' }, h('small', {}, `#${String(form.dex).padStart(3, '0')}`), form.name),
        h('div', { class: 'types' }, ...form.types.map(typeBadge)),
        picker,
        h('div', { class: 'inspect-blurb' }, m.blurbs[id]),
      ),
    ),
    h('div', { class: 'inspect-section' }, m.title.statsSection, h('span', { class: 'legend' }, h('i', { class: 'legend-base' }), `${m.title.legendBase} `, h('i', { class: 'legend-final' }), m.title.legendFinal)),
    h('div', { class: 'stat-bars' }, ...bars),
    h('div', { class: 'inspect-section' }, m.title.evolution),
    h('div', { class: 'evo-line' }, ...evo),
    h('div', { class: 'inspect-section' }, m.title.special, h('span', { class: 'legend' }, m.spaceKey)),
    specialRow(id),
    ...(megas.length > 0 ? [h('div', { class: 'inspect-section' }, megas.length > 1 ? m.mega.sectionTwo : m.mega.section, h('span', { class: 'legend' }, m.mega.key)), ...megas.map(megaRow)] : []),
    h('div', { class: 'inspect-section' }, m.title.moves),
    h('div', { class: 'move-list' }, ...s.learnset.map((m) => moveRow(m, m === s.signature))),
  )
}

/** A family still in its egg: a silhouette, "???" and the egg it hatches from (the Friendship Egg says how to get one). */
const lockedPanel = (id: HatchlingId, sprite: HTMLCanvasElement) => {
  const m = t()
  const tier = HATCHLINGS[id].egg
  return h(
    'div',
    { class: 'inspect-body' },
    h(
      'div',
      { class: 'inspect-head' },
      sprite,
      h(
        'div',
        { class: 'inspect-id' },
        h('div', { class: 'inspect-name' }, m.eggs.locked),
        h('div', { class: 'inspect-blurb locked-blurb' }, h('img', { src: eggIcon(tier), alt: '' }), rich(tier === 'friend' ? m.eggs.friendBlurb : m.eggs.lockedBlurb(m.eggs.tiers[tier]))),
      ),
    ),
    h('p', { class: 'inspect-blurb' }, m.eggs.intro),
  )
}

/**
 * Normal / Hard / Nightmare, with a line on what the picked one does. Every
 * level is open from the start; a pick is saved right away, so the next run
 * (and the next visit) plays it.
 */
const difficultyPicker = (initial: Difficulty) => {
  const m = t().difficulty
  let current = initial
  const options = DIFFICULTY_IDS.map((id) =>
    h('button', { class: `difficulty-option ${id}`, role: 'radio', onclick: () => set(id) }, m.names[id]),
  )
  const blurb = h('p', { class: 'difficulty-blurb' })
  const render = () => {
    options.forEach((o, i) => {
      const on = DIFFICULTY_IDS[i] === current
      o.classList.toggle('selected', on)
      o.setAttribute('aria-checked', String(on))
    })
    blurb.textContent = m.blurbs[current]
  }
  const set = (id: Difficulty) => {
    if (id === current) return
    current = id
    playSfx('move')
    updateSave((save) => ({ ...save, difficulty: id }))
    render()
  }
  /** The next level, wrapping around (the `X` key). */
  const cycle = () => set(DIFFICULTY_IDS[(DIFFICULTY_IDS.indexOf(current) + 1) % DIFFICULTY_IDS.length]!)
  render()
  const el = h(
    'div',
    { class: 'difficulty-picker' },
    h(
      'div',
      { class: 'difficulty-row' },
      h('span', { class: 'difficulty-label' }, m.label),
      h('div', { class: 'difficulty-options', role: 'radiogroup', 'aria-label': m.label }, ...options),
      h('span', { class: 'key-hint' }, 'X'),
    ),
    blurb,
  )
  return { el, cycle }
}

/** Keys that flip each bag item on the select screen. */
const BAG_KEYS = { lure: 'KeyC', incense: 'KeyV' } as const satisfies Record<BagItem, string>

/**
 * The bag's items for the next run: a toggle per item the player has (`C`
 * Lure, `V` Incense), saved right away; the run uses them up as it starts.
 * Hidden while the bag is empty.
 */
const bagPicker = (initial: Bag) => {
  const m = t().bag
  let bag = initial
  const counts = Object.fromEntries(BAG_ITEM_IDS.map((id) => [id, h('b', {})])) as Record<BagItem, HTMLElement>
  const options = BAG_ITEM_IDS.map((id) =>
    h(
      'button',
      { class: 'bag-option', role: 'switch', title: m.descriptions[id], onclick: () => toggle(id) },
      h('img', { src: bagIcon(id), alt: '' }),
      h('span', {}, BAG_ITEMS[id].name),
      counts[id],
      h('span', { class: 'key-hint' }, BAG_KEYS[id].slice(3)),
    ),
  )
  const blurb = h('p', { class: 'difficulty-blurb' })
  const render = () => {
    BAG_ITEM_IDS.forEach((id, i) => {
      const n = bagCount(bag, id)
      options[i]!.classList.toggle('hidden', n === 0)
      options[i]!.classList.toggle('selected', bag.armed[id])
      options[i]!.setAttribute('aria-checked', String(bag.armed[id]))
      counts[id].textContent = `×${n}`
    })
    const armed = BAG_ITEM_IDS.filter((id) => bag.armed[id])
    blurb.textContent = armed.length > 0 ? armed.map((id) => m.descriptions[id]).join(' ') : m.pickHint
    el.classList.toggle('hidden', BAG_ITEM_IDS.every((id) => bagCount(bag, id) === 0))
  }
  const toggle = (id: BagItem) => {
    if (bagCount(bag, id) === 0) return
    const on = !bag.armed[id]
    bag = armItem(bag, id, on)
    updateSave((save) => ({ ...save, bag: armItem(save.bag, id, on) }))
    playSfx(on ? 'shiny' : 'move')
    render()
  }
  const el = h(
    'div',
    { class: 'difficulty-picker bag-picker' },
    h('div', { class: 'difficulty-row' }, h('span', { class: 'difficulty-label' }, m.label), h('div', { class: 'bag-options' }, ...options)),
    blurb,
  )
  render()
  /** A key press: flips the item it belongs to. */
  const onKey = (key: string) => {
    const id = BAG_ITEM_IDS.find((i) => BAG_KEYS[i] === key)
    if (id) toggle(id)
  }
  return { el, onKey }
}

/** A tab of the select: a region's starter trio, or the box of egg families. */
type Group = { kind: 'region'; region: Region; ids: readonly PlayableId[] } | { kind: 'eggs'; ids: readonly PlayableId[] }

const GROUPS: readonly Group[] = [...REGIONS.map((region) => ({ kind: 'region', region, ids: region.starters }) as const), { kind: 'eggs', ids: HATCHLING_IDS }]

type Cursor = { group: number; slot: number }

type SelectActions = { pick: (id: PlayableId) => void; incubator: () => void }

/**
 * Region-tabbed Pokémon selector with an always-visible inspect panel. After
 * the 9 regions comes the egg box: hatched families to pick, the rest as
 * silhouettes, and the way into the incubator (`O`).
 * Keyboard: ←/→ Pokémon (wraps across tabs), ↑/↓ or Q/E tab (rows in the egg box), 1-9 jump to region,
 * X cycles the difficulty, Z flips Normal/Shiny (once its shiny is unlocked), C and V arm a Lure and an Incense, Enter confirms.
 * Pointer: hover/tap highlights, clicking the highlighted card (or the button) confirms.
 * `selected` reads the highlighted Pokémon, so a rebuilt screen (language switch) keeps it.
 */
export const starterSelect = (root: HTMLElement, input: Input, actions: SelectActions, initial: PlayableId = 'charmander'): Screen & { selected: () => PlayableId } => {
  const m = t()
  const save = loadSave()
  const unlocked = (id: PlayableId) => isUnlocked(save.hatched, id)
  /** A shiny hatch is shiny for good; a shiny rolled once can be picked (`shinyStarters`). */
  const hatchedShiny = (id: PlayableId) => isHatchling(id) && save.hatched[id]?.shiny === true
  let picks: ShinyStarters = save.shinyStarters
  const canPick = (id: PlayableId) => id in picks && !hatchedShiny(id)
  const shinyOf = (id: PlayableId) => hatchedShiny(id) || picks[id] === true
  const start = Math.max(0, GROUPS.findIndex((g) => g.ids.includes(initial)))
  const cursor: Cursor = { group: start, slot: Math.max(0, GROUPS[start]!.ids.indexOf(initial)) }
  let stage = 0
  let picked = false
  let cryTimer = 0

  const group = () => GROUPS[cursor.group]!
  const current = (): PlayableId => group().ids[cursor.slot]!

  const owned = HATCHLING_IDS.filter((id) => save.hatched[id]).length
  const tabs = GROUPS.map((g, i) =>
    h(
      'button',
      { class: g.kind === 'eggs' ? 'region-tab egg-tab' : 'region-tab', onclick: () => setCursor({ group: i, slot: 0 }) },
      g.kind === 'eggs' ? h('small', {}, `${owned}/${HATCHLING_IDS.length}`) : h('small', {}, `${g.region.gen}`),
      g.kind === 'eggs' ? m.eggs.tab : g.region.name,
    ),
  )

  /** A card (region trio) or a cell (egg box): canvas plus click/hover wiring. */
  const pickable = (el: HTMLElement, slot: number) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && slot !== cursor.slot) setCursor({ group: cursor.group, slot })
    })
    el.addEventListener('click', () => (slot === cursor.slot ? confirm() : setCursor({ group: cursor.group, slot })))
    return el
  }

  const cardCanvases = [0, 1, 2].map(() => h('canvas', { width: 64, height: 56, class: 'starter-sprite' }))
  const cardNames = [0, 1, 2].map(() => h('div', { class: 'starter-name' }))
  const cardTypes = [0, 1, 2].map(() => h('div', { class: 'types' }))
  const cardShiny = [0, 1, 2].map(() => h('img', { class: 'starter-shiny hidden', src: sparkleIcon(), alt: 'Shiny' }))
  const cards = [0, 1, 2].map((slot) => pickable(h('button', { class: 'starter-card box' }, cardCanvases[slot]!, cardShiny[slot]!, cardNames[slot]!, cardTypes[slot]!), slot))
  const trio = h('div', { class: 'starters' }, ...cards)

  const cellCanvases = HATCHLING_IDS.map(() => h('canvas', { width: 48, height: 40, class: 'egg-cell-sprite' }))
  const cells = HATCHLING_IDS.map((id, slot) =>
    pickable(
      h(
        'button',
        { class: unlocked(id) ? 'egg-cell' : 'egg-cell locked', title: unlocked(id) ? PLAYABLE[id].name : m.eggs.locked },
        cellCanvases[slot]!,
        !unlocked(id) && h('img', { class: 'egg-cell-tag', src: eggIcon(HATCHLINGS[id].egg), alt: '' }),
        shinyOf(id) && h('img', { class: 'egg-cell-tag', src: sparkleIcon(), alt: 'Shiny' }),
      ),
      slot,
    ),
  )
  const ready = save.eggs.filter(isReady).length
  const openIncubator = () => (playSfx('select'), later(actions.incubator))
  const grid = h('div', { class: 'egg-box' }, ...cells)
  /** Columns the egg box shows right now (CSS changes them with the screen); ↑/↓ move a row inside it. */
  const boxCols = () => getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1
  const box = h(
    'div',
    { class: 'egg-box-wrap hidden' },
    grid,
    h(
      'button',
      { class: 'incubator-entry box', onclick: openIncubator },
      h('img', { src: eggIcon('common'), alt: '' }),
      h('span', {}, m.eggs.incubator(save.eggs.length, EGGS.slots)),
      ready > 0 && h('b', { class: 'blink' }, m.eggs.readyBadge(ready)),
      h('span', { class: 'key-hint' }, 'O'),
    ),
  )

  const inspectSprite = h('canvas', { width: 72, height: 72, class: 'inspect-sprite' })
  const inspect = h('div', { class: 'inspect box' })
  const confirmBtn = h('button', { class: 'btn confirm selected', onclick: () => confirm() })
  const difficulty = difficultyPicker(save.difficulty)
  const bag = bagPicker(save.bag)

  const renderGroup = () => {
    const g = group()
    tabs.forEach((t, i) => t.classList.toggle('selected', i === cursor.group))
    tabs[cursor.group]!.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    trio.classList.toggle('hidden', g.kind !== 'region')
    box.classList.toggle('hidden', g.kind !== 'eggs')
    if (g.kind === 'eggs') {
      cells.forEach((c, i) => c.classList.toggle('selected', i === cursor.slot))
      // The box scrolls on its own: keep the highlighted cell in it.
      cells[cursor.slot]!.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      // Silhouettes need the sprites too.
      void loadAll(HATCHLING_IDS.map((id) => PLAYABLE[id].line[0].dex)).catch(() => {})
      for (const id of HATCHLING_IDS) if (shinyOf(id)) void loadSpecies(PLAYABLE[id].line[0].dex, true).catch(() => {})
      return
    }
    g.ids.forEach((id, slot) => {
      const s = PLAYABLE[id]
      cards[slot]!.style.setProperty('--accent', s.color)
      cards[slot]!.classList.toggle('selected', slot === cursor.slot)
      cardNames[slot]!.textContent = s.name
      cardTypes[slot]!.replaceChildren(...s.line[0].types.map(typeBadge))
      cardShiny[slot]!.classList.toggle('hidden', !shinyOf(id))
      if (shinyOf(id)) void loadSpecies(s.line[0].dex, true).catch(() => {})
    })
    // Menu sprites load on demand: the visible trio first, the rest in the background (see main.ts).
    void loadAll(g.ids.map((id) => PLAYABLE[id].line[0].dex)).catch(() => {})
  }

  const renderInspect = () => {
    const id = current()
    const open = unlocked(id)
    void loadSpecies(PLAYABLE[id].line[stage]!.dex, shinyOf(id)).catch(() => {})
    inspect.style.setProperty('--accent', open ? PLAYABLE[id].color : '#707088')
    inspect.replaceChildren(
      h('div', { class: 'dialog-title' }, m.title.inspect),
      isHatchling(id) && !open
        ? lockedPanel(id, inspectSprite)
        : inspectPanel(id, stage, (i) => {
            stage = i
            playSfx('move')
            renderInspect()
          }, inspectSprite, canPick(id) ? shinyPicker(shinyOf(id), setShiny) : null),
    )
    confirmBtn.textContent = open ? m.title.choose(PLAYABLE[id].name) : m.eggs.lockedButton
    confirmBtn.classList.toggle('locked', !open)
  }

  /** Picks Normal or Shiny for the highlighted Pokémon, saved for its next run. */
  function setShiny(shiny: boolean) {
    const id = current()
    if (!canPick(id) || shinyOf(id) === shiny) return
    picks = pickShinyStarter(picks, id, shiny)
    updateSave((s) => ({ ...s, shinyStarters: pickShinyStarter(s.shinyStarters, id, shiny) }))
    playSfx(shiny ? 'shiny' : 'move')
    renderGroup()
    renderInspect()
  }

  const setCursor = (next: Cursor, sound = true) => {
    const changed = next.group !== cursor.group || next.slot !== cursor.slot
    cursor.group = (next.group + GROUPS.length) % GROUPS.length
    cursor.slot = Math.min(next.slot, group().ids.length - 1)
    stage = 0
    renderGroup()
    renderInspect()
    if (!sound || !changed) return
    playSfx('move')
    clearTimeout(cryTimer)
    const id = current()
    if (!unlocked(id)) return
    cryTimer = window.setTimeout(() => playCry(cryUrl(PLAYABLE[id].line[0].dex), 0.25), 260)
  }

  /** ←/→ walk through every Pokémon, spilling over into the neighbouring tab. */
  const stepSlot = (delta: number) => {
    const slot = cursor.slot + delta
    if (slot < 0) return setCursor({ group: cursor.group - 1, slot: GROUPS.at((cursor.group - 1) % GROUPS.length)!.ids.length - 1 })
    if (slot >= group().ids.length) return setCursor({ group: cursor.group + 1, slot: 0 })
    setCursor({ group: cursor.group, slot })
  }

  /** ↑/↓: the next tab, or a row up/down inside the egg box. */
  const stepRow = (delta: number) => {
    const slot = cursor.slot + delta * boxCols()
    if (group().kind === 'eggs' && slot >= 0 && slot < group().ids.length) return setCursor({ group: cursor.group, slot })
    setCursor({ group: cursor.group + delta, slot: cursor.slot })
  }

  const confirm = () => {
    if (picked) return
    const id = current()
    if (!unlocked(id)) return playSfx('denied')
    picked = true
    clearTimeout(cryTimer)
    playSfx('select')
    playCry(cryUrl(PLAYABLE[id].line[0].dex))
    actions.pick(id)
  }

  const off = input.onKey((key) => {
    if (key === 'ArrowLeft' || key === 'KeyA') stepSlot(-1)
    else if (key === 'ArrowRight' || key === 'KeyD') stepSlot(1)
    else if (key === 'ArrowUp' || key === 'KeyW') stepRow(-1)
    else if (key === 'ArrowDown' || key === 'KeyS') stepRow(1)
    else if (key === 'KeyQ' || key === 'PageUp') setCursor({ group: cursor.group - 1, slot: cursor.slot })
    else if (key === 'KeyE' || key === 'PageDown') setCursor({ group: cursor.group + 1, slot: cursor.slot })
    else if (key === 'KeyO') openIncubator()
    else if (key === 'KeyX') difficulty.cycle()
    else if (key === 'KeyZ') setShiny(!shinyOf(current()))
    else if (key === 'Enter' || key === 'Space') confirm()
    else if (/^Digit[1-9]$/.test(key)) setCursor({ group: Number(key.slice(5)) - 1, slot: cursor.slot })
    else bag.onKey(key)
  })

  const el = h(
    'div',
    { class: 'screen title-screen select-screen' },
    h('h1', { class: 'logo' }, h('span', { class: 'logo-top' }, 'POKéMON'), h('span', { class: 'logo-bottom' }, 'SURVIVORS')),
    h('p', { class: 'subtitle blink' }, m.title.subtitle),
    h(
      'div',
      { class: 'select-layout' },
      h('div', { class: 'select-main' }, h('div', { class: 'region-tabs', role: 'tablist' }, ...tabs), trio, box, hint(m.title.hintKeys, m.title.hintTouch)),
      inspect,
      h('div', { class: 'select-footer' }, difficulty.el, bag.el, confirmBtn),
    ),
    h('p', { class: 'credits' }, m.title.credits),
  )
  root.append(el)
  setCursor(cursor, false)

  /** Draws a Pokémon on a menu canvas; still loading shows a bobbing Poké Ball, `locked` a dark silhouette. */
  const draw = (canvas: HTMLCanvasElement, dex: number, t: number, opts: { walking: boolean; shiny?: boolean; locked?: boolean }) => {
    const ctx = context2d(canvas)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const s = (opts.shiny && loadedSprites(dex, true)) || loadedSprites(dex)
    const tint = opts.locked ? { color: '#283048', amount: 1 } : undefined
    if (s) drawPokemon(ctx, s, opts.walking && !opts.locked ? 'Walk' : 'Idle', 0, opts.locked ? 0 : t, canvas.width / 2, canvas.height - 6, { tint })
    else blitCentered(ctx, PICKUPS.pokeball(), canvas.width / 2, canvas.height / 2 + Math.round(Math.sin(t * 6) * 2))
  }

  const tick = (t: number) => {
    const g = group()
    if (g.kind === 'eggs')
      HATCHLING_IDS.forEach((id, slot) =>
        draw(cellCanvases[slot]!, PLAYABLE[id].line[0].dex, t, { walking: slot === cursor.slot, shiny: shinyOf(id), locked: !unlocked(id) }),
      )
    else g.ids.forEach((id, slot) => draw(cardCanvases[slot]!, PLAYABLE[id].line[0].dex, t, { walking: slot === cursor.slot, shiny: shinyOf(id) }))
    const id = current()
    draw(inspectSprite, PLAYABLE[id].line[stage]!.dex, t, { walking: true, shiny: shinyOf(id), locked: !unlocked(id) })
  }

  return { el, tick, selected: current, dispose: () => (off(), clearTimeout(cryTimer), el.remove()) }
}
