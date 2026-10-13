import { blitCentered, context2d } from '../engine/pixelart'
import { playCry, playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { REGIONS, STARTERS, type StarterDef, type StarterId } from '../data/starters'
import { TYPE_COLORS } from '../data/types'
import { starterStats } from '../game/leveling'
import { MOVES, type MoveDef, type MoveId } from '../game/moves'
import { resolveSpecial } from '../game/special'
import { moveIcon, PICKUPS } from '../render/art'
import { specialIcon } from '../render/specialFx'
import { cryUrl, drawPokemon, loadAll, loadedSprites, loadSpecies, portraitUrl } from '../render/sprites'
import { t } from '../i18n'
import { h } from './dom'
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

/** The manual special (Space / round button): base move, upgraded at the final stage. */
const specialRow = (id: StarterId) => {
  const { id: special, def } = resolveSpecial(id, 0)
  return h(
    'div',
    { class: 'move-row signature' },
    h('img', { src: specialIcon(special), alt: '' }),
    h('div', { class: 'move-text' }, h('div', { class: 'move-name' }, `${def.base.name} → ${def.final.name}`), h('div', { class: 'move-desc' }, t().specials[def.kind])),
    typeBadge(def.type),
  )
}

/** Detailed sheet of a starter: sprite, types, stat bars, evolution line and every move it can learn. */
const inspectPanel = (id: StarterId, stage: number, onStage: (stage: number) => void, sprite: HTMLCanvasElement) => {
  const m = t()
  const s = STARTERS[id]
  const form = s.line[stage]!
  const base = starterStats(id, 0)
  const final = starterStats(id, 2)

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

  const line: StarterDef['line'] = s.line
  const evo = line.flatMap((st, i) => [
    i > 0 && h('span', { class: 'evo-arrow' }, m.level(line[i - 1]!.evolveAt!), h('br'), '▶'),
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
        h('div', { class: 'inspect-blurb' }, m.blurbs[id]),
      ),
    ),
    h('div', { class: 'inspect-section' }, m.title.statsSection, h('span', { class: 'legend' }, h('i', { class: 'legend-base' }), `${m.title.legendBase} `, h('i', { class: 'legend-final' }), m.title.legendFinal)),
    h('div', { class: 'stat-bars' }, ...bars),
    h('div', { class: 'inspect-section' }, m.title.evolution),
    h('div', { class: 'evo-line' }, ...evo),
    h('div', { class: 'inspect-section' }, m.title.special, h('span', { class: 'legend' }, m.spaceKey)),
    specialRow(id),
    h('div', { class: 'inspect-section' }, m.title.moves),
    h('div', { class: 'move-list' }, ...s.learnset.map((m) => moveRow(m, m === s.signature))),
  )
}

type Cursor = { region: number; slot: number }

/**
 * Region-tabbed starter selector with an always-visible inspect panel.
 * Keyboard: ←/→ starter (wraps across regions), ↑/↓ or Q/E region, 1-9 jump to region, Enter confirms.
 * Pointer: hover/tap highlights, clicking the highlighted card (or the button) confirms.
 * `selected` reads the highlighted starter, so a rebuilt screen (language switch) keeps it.
 */
export const starterSelect = (
  root: HTMLElement,
  input: Input,
  onPick: (id: StarterId) => void,
  initial: StarterId = 'charmander',
): Screen & { selected: () => StarterId } => {
  const start = Math.max(0, REGIONS.findIndex((r) => r.starters.includes(initial)))
  const cursor: Cursor = { region: start, slot: Math.max(0, REGIONS[start]!.starters.indexOf(initial)) }
  let stage = 0
  let picked = false
  let cryTimer = 0

  const current = (): StarterId => REGIONS[cursor.region]!.starters[cursor.slot]!

  const tabs = REGIONS.map((r, i) =>
    h('button', { class: 'region-tab', onclick: () => setCursor({ region: i, slot: cursor.slot }) }, h('small', {}, `${r.gen}`), r.name),
  )
  const cardCanvases = [0, 1, 2].map(() => h('canvas', { width: 64, height: 56, class: 'starter-sprite' }))
  const cardNames = [0, 1, 2].map(() => h('div', { class: 'starter-name' }))
  const cardTypes = [0, 1, 2].map(() => h('div', { class: 'types' }))
  const cards = [0, 1, 2].map((slot) => {
    const card = h('button', { class: 'starter-card box' }, cardCanvases[slot]!, cardNames[slot]!, cardTypes[slot]!)
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && slot !== cursor.slot) setCursor({ region: cursor.region, slot })
    })
    card.addEventListener('click', () => (slot === cursor.slot ? confirm() : setCursor({ region: cursor.region, slot })))
    return card
  })
  const inspectSprite = h('canvas', { width: 72, height: 72, class: 'inspect-sprite' })
  const inspect = h('div', { class: 'inspect box' })
  const confirmBtn = h('button', { class: 'btn confirm selected', onclick: () => confirm() })

  const renderRegion = () => {
    const region = REGIONS[cursor.region]!
    tabs.forEach((t, i) => t.classList.toggle('selected', i === cursor.region))
    tabs[cursor.region]!.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    region.starters.forEach((id, slot) => {
      const s = STARTERS[id]
      cards[slot]!.style.setProperty('--accent', s.color)
      cards[slot]!.classList.toggle('selected', slot === cursor.slot)
      cardNames[slot]!.textContent = s.name
      cardTypes[slot]!.replaceChildren(...s.line[0].types.map(typeBadge))
    })
    // Menu sprites load on demand: the visible trio first, the rest in the background (see main.ts).
    void loadAll(region.starters.map((id) => STARTERS[id].line[0].dex)).catch(() => {})
  }

  const renderInspect = () => {
    const id = current()
    void loadSpecies(STARTERS[id].line[stage]!.dex).catch(() => {})
    inspect.style.setProperty('--accent', STARTERS[id].color)
    inspect.replaceChildren(
      h('div', { class: 'dialog-title' }, t().title.inspect),
      inspectPanel(id, stage, (i) => {
        stage = i
        playSfx('move')
        renderInspect()
      }, inspectSprite),
    )
    confirmBtn.textContent = t().title.choose(STARTERS[id].name)
  }

  const setCursor = (next: Cursor, sound = true) => {
    const changed = next.region !== cursor.region || next.slot !== cursor.slot
    cursor.region = (next.region + REGIONS.length) % REGIONS.length
    cursor.slot = next.slot
    stage = 0
    renderRegion()
    renderInspect()
    if (!sound || !changed) return
    playSfx('move')
    clearTimeout(cryTimer)
    const dex = STARTERS[current()].line[0].dex
    cryTimer = window.setTimeout(() => playCry(cryUrl(dex), 0.25), 260)
  }

  /** ←/→ walk through all 27 starters, spilling over into the neighbouring region. */
  const stepSlot = (delta: number) => {
    const slot = cursor.slot + delta
    if (slot < 0) return setCursor({ region: cursor.region - 1, slot: 2 })
    if (slot > 2) return setCursor({ region: cursor.region + 1, slot: 0 })
    setCursor({ region: cursor.region, slot })
  }

  const confirm = () => {
    if (picked) return
    picked = true
    clearTimeout(cryTimer)
    const id = current()
    playSfx('select')
    playCry(cryUrl(STARTERS[id].line[0].dex))
    onPick(id)
  }

  const off = input.onKey((key) => {
    if (key === 'ArrowLeft' || key === 'KeyA') stepSlot(-1)
    else if (key === 'ArrowRight' || key === 'KeyD') stepSlot(1)
    else if (key === 'ArrowUp' || key === 'KeyW' || key === 'KeyQ' || key === 'PageUp') setCursor({ region: cursor.region - 1, slot: cursor.slot })
    else if (key === 'ArrowDown' || key === 'KeyS' || key === 'KeyE' || key === 'PageDown') setCursor({ region: cursor.region + 1, slot: cursor.slot })
    else if (key === 'Enter' || key === 'Space') confirm()
    else if (/^Digit[1-9]$/.test(key)) setCursor({ region: Number(key.slice(5)) - 1, slot: cursor.slot })
  })

  const el = h(
    'div',
    { class: 'screen title-screen select-screen' },
    h('h1', { class: 'logo' }, h('span', { class: 'logo-top' }, 'POKéMON'), h('span', { class: 'logo-bottom' }, 'SURVIVORS')),
    h('p', { class: 'subtitle blink' }, t().title.subtitle),
    h(
      'div',
      { class: 'select-layout' },
      h(
        'div',
        { class: 'select-main' },
        h('div', { class: 'region-tabs', role: 'tablist' }, ...tabs),
        h('div', { class: 'starters' }, ...cards),
        hint(t().title.hintKeys, t().title.hintTouch),
      ),
      inspect,
      h('div', { class: 'select-footer' }, confirmBtn),
    ),
    h('p', { class: 'credits' }, t().title.credits),
  )
  root.append(el)
  setCursor(cursor, false)

  /** Draws the trio and the inspected form; species still loading show a bobbing Poké Ball. */
  const draw = (canvas: HTMLCanvasElement, dex: number, t: number, walking: boolean) => {
    const ctx = context2d(canvas)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const s = loadedSprites(dex)
    if (s) drawPokemon(ctx, s, walking ? 'Walk' : 'Idle', 0, t, canvas.width / 2, canvas.height - 8)
    else blitCentered(ctx, PICKUPS.pokeball(), canvas.width / 2, canvas.height / 2 + Math.round(Math.sin(t * 6) * 2))
  }

  const tick = (t: number) => {
    REGIONS[cursor.region]!.starters.forEach((id, slot) => draw(cardCanvases[slot]!, STARTERS[id].line[0].dex, t, slot === cursor.slot))
    draw(inspectSprite, STARTERS[current()].line[stage]!.dex, t, true)
  }

  return { el, tick, selected: current, dispose: () => (off(), clearTimeout(cryTimer), el.remove()) }
}
