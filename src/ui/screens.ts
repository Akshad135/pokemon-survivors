import { formatTime } from '../engine/math'
import { playSfx, toggleMute } from '../engine/audio'
import type { Input } from '../engine/input'
import { ITEMS } from '../data/items'
import { STARTERS } from '../data/starters'
import { TYPE_COLORS, type PokeType } from '../data/types'
import { maxMoveLevel, MOVES, type MoveDef } from '../game/moves'
import { playerDex } from '../game/game'
import { resolveSpecial } from '../game/special'
import type { DamageSource, Game, Offer } from '../game/types'
import { berryIcon, itemIcon, moveIcon, sparkleIcon } from '../render/art'
import { specialIcon } from '../render/specialFx'
import { sprites } from '../render/sprites'
import { h } from './dom'

export type Screen = { el: HTMLElement; tick?: (t: number) => void; dispose: () => void }

export const typeBadge = (type: PokeType) => h('span', { class: 'type-badge', style: `--type:${TYPE_COLORS[type]}` }, type.toUpperCase())

/** Taps this soon after a menu opens are ignored: a thumb still steering the joystick shouldn't pick an upgrade. */
const TAP_GUARD_MS = 350

/** Hint that swaps between keyboard and touch wording (see `.keys-only` / `.touch-only` in CSS). */
export const hint = (keys: string, touch: string) =>
  h('p', { class: 'hint' }, h('span', { class: 'keys-only' }, keys), h('span', { class: 'touch-only' }, touch))

/**
 * Shared keyboard/pointer navigation for a list of buttons.
 * Arrows move the cursor, Enter/Space activate, digits pick directly.
 */
const menu = (input: Input, buttons: HTMLElement[], activate: (i: number) => void, opts: { horizontal?: boolean; initial?: number } = {}) => {
  let index = opts.initial ?? 0
  const openedAt = performance.now()
  const focus = (i: number, sound = true) => {
    index = (i + buttons.length) % buttons.length
    buttons.forEach((b, j) => b.classList.toggle('selected', j === index))
    if (sound) playSfx('move')
  }
  buttons.forEach((b, i) => {
    b.addEventListener('pointerenter', () => i !== index && focus(i))
    b.addEventListener('click', () => performance.now() - openedAt > TAP_GUARD_MS && activate(i))
  })
  focus(index, false)
  const prev = opts.horizontal ? ['ArrowLeft', 'KeyA'] : ['ArrowUp', 'KeyW']
  const next = opts.horizontal ? ['ArrowRight', 'KeyD'] : ['ArrowDown', 'KeyS']
  const off = input.onKey((key) => {
    if (prev.includes(key)) focus(index - 1)
    else if (next.includes(key)) focus(index + 1)
    else if (key === 'Enter' || key === 'Space') activate(index)
    else if (/^Digit[1-9]$/.test(key)) {
      const i = Number(key.slice(5)) - 1
      if (i < buttons.length) activate(i)
    }
  })
  return { off, focus, get index() { return index } }
}

/* ---------------- Level up ---------------- */

const offerView = (g: Game, offer: Offer) => {
  switch (offer.kind) {
    case 'move': {
      const def: MoveDef = MOVES[offer.id]
      const isNew = offer.level === 1
      return {
        icon: moveIcon(offer.id),
        name: def.name,
        tag: isNew ? 'NOVO!' : offer.level === maxMoveLevel(offer.id) ? 'MAX' : `Nv ${offer.level}`,
        isNew,
        desc: isNew ? def.description : def.upgrades[offer.level - 2]!.text,
        type: def.type,
      }
    }
    case 'item': {
      const def = ITEMS[offer.id]
      return { icon: itemIcon(offer.id), name: def.name, tag: offer.level === 1 ? 'NOVO!' : `Nv ${offer.level}`, isNew: offer.level === 1, desc: def.description, type: null }
    }
    case 'berry':
      return { icon: berryIcon(), name: 'Oran Berry', tag: '', isNew: false, desc: `${STARTERS[g.starter].name} recupera 40 HP.`, type: null }
  }
}

export const levelUp = (root: HTMLElement, input: Input, g: Game, onChoose: (offer: Offer) => void): Screen => {
  const name = STARTERS[g.starter].line[g.player.stage]!.name
  const buttons = g.offers.map((offer, i) => {
    const v = offerView(g, offer)
    return h(
      'button',
      { class: 'offer' },
      h('span', { class: 'offer-key' }, i + 1),
      h('div', { class: 'offer-icon' }, h('img', { src: v.icon, alt: '' })),
      h(
        'div',
        { class: 'offer-body' },
        h('div', { class: 'offer-name' }, v.name, v.tag && h('span', { class: v.isNew ? 'tag tag-new' : 'tag' }, v.tag)),
        h('div', { class: 'offer-desc' }, v.desc),
      ),
      v.type && typeBadge(v.type),
    )
  })

  let done = false
  // Space also fires the special attack: ignore presses that were meant for the fight.
  const openedAt = performance.now()
  const nav = menu(input, buttons, (i) => {
    if (done || performance.now() - openedAt < 400) return
    done = true
    playSfx('select')
    onChoose(g.offers[i]!)
  })

  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop' },
      h('div', { class: 'dialog-title' }, `${name} subiu para o Nv ${g.player.level - g.pendingLevelUps + 1}!`),
      h('div', { class: 'offers' }, ...buttons),
      hint('↑ ↓ escolher · ENTER confirmar · 1-3 atalho', 'Toque para escolher'),
    ),
  )
  root.append(el)
  return { el, dispose: () => (nav.off(), el.remove()) }
}

/* ---------------- Pause ---------------- */

const STAT_ROWS = [
  ['Dano', (s: Game['player']['stats']) => `x${s.might.toFixed(2)}`],
  ['Área', (s) => `x${s.area.toFixed(2)}`],
  ['Recarga', (s) => `x${s.cooldown.toFixed(2)}`],
  ['Duração', (s) => `x${s.duration.toFixed(2)}`],
  ['Projéteis', (s) => `+${s.amount}`],
  ['Velocidade', (s) => `${Math.round(s.speed)}`],
  ['Defesa', (s) => `${s.armor}`],
  ['Regeneração', (s) => `${s.regen.toFixed(1)}/s`],
] as const satisfies ReadonlyArray<readonly [string, (s: Game['player']['stats']) => string]>

const loadoutList = (g: Game) =>
  h(
    'div',
    { class: 'loadout-list' },
    ...g.player.moves.map((m) =>
      h('div', { class: 'loadout-row' }, h('img', { src: moveIcon(m.id), alt: '' }), MOVES[m.id].name, h('span', { class: 'tag' }, `Nv ${m.level}`)),
    ),
    ...g.player.items.map((i) =>
      h('div', { class: 'loadout-row' }, h('img', { src: itemIcon(i.id), alt: '' }), ITEMS[i.id].name, h('span', { class: 'tag' }, `Nv ${i.level}`)),
    ),
  )

export const pauseMenu = (root: HTMLElement, input: Input, g: Game, onResume: () => void, onQuit: () => void): Screen => {
  const muteLabel = () => (localStorage.getItem('ps:muted') === '1' ? 'Som: OFF' : 'Som: ON')
  const resume = h('button', { class: 'btn' }, 'Continuar')
  const mute = h('button', { class: 'btn' }, muteLabel())
  const quit = h('button', { class: 'btn' }, 'Desistir')
  const nav = menu(input, [resume, mute, quit], (i) => {
    if (i === 0) onResume()
    if (i === 1) {
      toggleMute()
      mute.textContent = muteLabel()
    }
    if (i === 2) onQuit()
  })
  const offEsc = input.onKey((k) => k === 'Escape' && onResume())
  const s = g.player.stats
  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop wide' },
      h('div', { class: 'dialog-title' }, 'PAUSA'),
      h(
        'div',
        { class: 'pause-grid' },
        loadoutList(g),
        h('div', { class: 'stat-list' }, ...STAT_ROWS.map(([label, fmt]) => h('div', { class: 'stat-row' }, h('span', {}, label), h('b', {}, fmt(s))))),
      ),
      h('div', { class: 'buttons' }, resume, mute, quit),
    ),
  )
  root.append(el)
  return { el, dispose: () => (nav.off(), offEsc(), el.remove()) }
}

/* ---------------- Results ---------------- */

/** Icon, name and type for a results-screen damage row. */
const damageSource = (g: Game, id: DamageSource) => {
  if (id !== 'special') return { icon: moveIcon(id), name: MOVES[id].name, type: MOVES[id].type }
  const r = resolveSpecial(g.starter, g.player.stage)
  return { icon: specialIcon(r.id), name: r.tier.name, type: r.def.type }
}

export const results = (root: HTMLElement, input: Input, g: Game, onRetry: () => void, onMenu: () => void): Screen => {
  const victory = g.phase === 'victory'
  const name = STARTERS[g.starter].line[g.player.stage]!.name
  const entries = (Object.entries(g.damageByMove) as Array<[DamageSource, number]>).sort((a, b) => b[1] - a[1])
  const top = entries[0]?.[1] ?? 1
  const retry = h('button', { class: 'btn' }, 'Tentar de novo')
  const back = h('button', { class: 'btn' }, 'Trocar Pokémon')
  const nav = menu(input, [retry, back], (i) => (i === 0 ? onRetry() : onMenu()), { horizontal: true })

  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop wide' },
      h(
        'div',
        { class: 'portrait-wrap' },
        h('img', { class: 'result-portrait', src: sprites(playerDex(g), g.player.shiny).portrait.src, alt: '' }),
        g.player.shiny && h('img', { class: 'shiny-badge', src: sparkleIcon(), alt: 'Shiny' }),
      ),
      h('div', { class: 'dialog-title' }, victory ? 'Você venceu Mewtwo!' : `${name} desmaiou!`),
      g.player.shiny && h('div', { class: 'tag tag-shiny' }, `${name} shiny`),
      h(
        'div',
        { class: 'result-stats' },
        h('div', {}, h('span', {}, 'Tempo'), h('b', {}, formatTime(g.time))),
        h('div', {}, h('span', {}, 'Nível'), h('b', {}, g.player.level)),
        h('div', {}, h('span', {}, 'Derrotados'), h('b', {}, g.kills)),
      ),
      h(
        'div',
        { class: 'damage-list' },
        ...entries.map(([id, dmg]) => {
          const src = damageSource(g, id)
          return h(
            'div',
            { class: 'damage-row' },
            h('img', { src: src.icon, alt: '' }),
            h('span', { class: 'damage-name' }, src.name),
            h('div', { class: 'damage-bar' }, h('div', { style: `width:${(dmg / top) * 100}%;--type:${TYPE_COLORS[src.type]}` })),
            h('b', {}, Math.round(dmg).toLocaleString('pt-BR')),
          )
        }),
      ),
      h('div', { class: 'buttons' }, retry, back),
    ),
  )
  root.append(el)
  return { el, dispose: () => (nav.off(), el.remove()) }
}

/* ---------------- Text box & toasts ---------------- */

/** Bottom dialog box, Pokémon style. Returns a disposer. */
export const textBox = (root: HTMLElement, text: string) => {
  const el = h('div', { class: 'textbox box' }, h('p', {}, text))
  root.append(el)
  return () => el.remove()
}

export const toast = (root: HTMLElement, content: HTMLElement | string, ms = 2600) => {
  const el = h('div', { class: 'toast box' }, content)
  root.append(el)
  setTimeout(() => el.classList.add('out'), ms)
  setTimeout(() => el.remove(), ms + 400)
}

/** Big centered announcement (legendary entrances). Wraps on small screens. */
export const banner = (root: HTMLElement, content: HTMLElement | string, ms = 3600) => {
  const el = h('div', { class: 'banner box' }, content)
  root.append(el)
  setTimeout(() => el.classList.add('out'), ms)
  setTimeout(() => el.remove(), ms + 400)
}

/** Full-screen white flash that fades out by itself. */
export const flashScreen = (root: HTMLElement) => {
  const el = h('div', { class: 'screen-flash' })
  root.append(el)
  setTimeout(() => el.remove(), 1000)
}
