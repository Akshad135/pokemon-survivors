import { context2d } from '../engine/pixelart'
import { formatTime } from '../engine/math'
import { playCry, playSfx, toggleMute } from '../engine/audio'
import type { Input } from '../engine/input'
import { canEvolve, EVOLUTIONS, evolutionOf, evolvedFrom, type MoveEvolution } from '../data/evolutions'
import { ITEMS } from '../data/items'
import { STARTER_IDS, STARTERS, type StarterId } from '../data/starters'
import { TYPE_COLORS, type PokeType } from '../data/types'
import { maxMoveLevel, MOVES, type MoveDef, type MoveId } from '../game/moves'
import { playerDex } from '../game/game'
import type { Game, Offer } from '../game/types'
import { berryIcon, itemIcon, moveIcon } from '../render/art'
import { drawPokemon, sprites } from '../render/sprites'
import { h } from './dom'

export type Screen = { el: HTMLElement; tick?: (t: number) => void; dispose: () => void }

const typeBadge = (type: PokeType) => h('span', { class: 'type-badge', style: `--type:${TYPE_COLORS[type]}` }, type.toUpperCase())

/**
 * Shared keyboard/pointer navigation for a list of buttons.
 * Arrows move the cursor, Enter/Space activate, digits pick directly.
 */
const menu = (input: Input, buttons: HTMLElement[], activate: (i: number) => void, opts: { horizontal?: boolean; initial?: number } = {}) => {
  let index = opts.initial ?? 0
  const focus = (i: number, sound = true) => {
    index = (i + buttons.length) % buttons.length
    buttons.forEach((b, j) => b.classList.toggle('selected', j === index))
    if (sound) playSfx('move')
  }
  buttons.forEach((b, i) => {
    b.addEventListener('pointerenter', () => i !== index && focus(i))
    b.addEventListener('click', () => activate(i))
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

/* ---------------- Starter select ---------------- */

export const starterSelect = (root: HTMLElement, input: Input, onPick: (id: StarterId) => void): Screen => {
  const canvases = new Map<StarterId, HTMLCanvasElement>()
  const cards = STARTER_IDS.map((id) => {
    const s = STARTERS[id]
    const canvas = h('canvas', { width: 64, height: 56, class: 'starter-sprite' })
    canvases.set(id, canvas)
    const sig: MoveDef = MOVES[s.signature]
    return h(
      'button',
      { class: 'starter-card box', style: `--accent:${s.color}` },
      canvas,
      h('div', { class: 'starter-name' }, s.name),
      h('div', { class: 'types' }, ...s.types.map(typeBadge)),
      h('div', { class: 'starter-blurb' }, s.blurb),
      h('div', { class: 'starter-move' }, h('img', { src: moveIcon(s.signature), alt: '' }), sig.name),
    )
  })

  let picked = false
  const nav = menu(
    input,
    cards,
    (i) => {
      if (picked) return
      picked = true
      const id = STARTER_IDS[i]!
      playSfx('select')
      playCry(sprites(STARTERS[id].line[0].dex).cry)
      onPick(id)
    },
    { horizontal: true },
  )

  const el = h(
    'div',
    { class: 'screen title-screen' },
    h('h1', { class: 'logo' }, h('span', { class: 'logo-top' }, 'POKéMON'), h('span', { class: 'logo-bottom' }, 'SURVIVORS')),
    h('p', { class: 'subtitle blink' }, 'Escolha seu parceiro!'),
    h('div', { class: 'starters' }, ...cards),
    h('p', { class: 'hint' }, '← → escolher · ENTER confirmar · WASD/setas para andar'),
    h('p', { class: 'credits' }, 'Sprites: PMD SpriteCollab · Cries: PokéAPI · Pokémon © Nintendo/Game Freak'),
  )
  root.append(el)

  const tick = (t: number) => {
    STARTER_IDS.forEach((id, i) => {
      const canvas = canvases.get(id)!
      const ctx = context2d(canvas)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const selected = i === nav.index
      drawPokemon(ctx, sprites(STARTERS[id].line[0].dex), selected ? 'Walk' : 'Idle', 0, t, 32, 48)
    })
  }

  return { el, tick, dispose: () => (nav.off(), el.remove()) }
}

/* ---------------- Level up ---------------- */

/** "Ember + Charcoal → Flamethrower" chip. `ready` lights it up when the evolution is available. */
const evoRecipe = (evo: MoveEvolution, ready: boolean) =>
  h(
    'span',
    { class: ready ? 'evo-recipe ready' : 'evo-recipe', title: `${MOVES[evo.from].name} + ${ITEMS[evo.item].name} → ${MOVES[evo.to].name}` },
    h('img', { src: moveIcon(evo.from), alt: '' }),
    '+',
    h('img', { src: itemIcon(evo.item), alt: '' }),
    '→',
    h('img', { src: moveIcon(evo.to), alt: '' }),
    ready && h('b', {}, 'PRONTO!'),
  )

/** Recipes an offer takes part in, flagged ready if picking it completes the pair. */
const offerRecipes = (g: Game, offer: Offer) => {
  const p = g.player
  switch (offer.kind) {
    case 'move': {
      const evo = evolutionOf(offer.id)
      return evo ? [evoRecipe(evo, canEvolve(evo, { moves: [{ ...offer, cooldown: 0 }], items: p.items }))] : []
    }
    case 'item': {
      const learnset: readonly MoveId[] = STARTERS[g.starter].learnset
      return EVOLUTIONS.filter((e) => e.item === offer.id && learnset.includes(e.from)).map((e) =>
        evoRecipe(e, canEvolve(e, { moves: p.moves, items: [offer] })),
      )
    }
    default:
      return []
  }
}

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
    case 'evolution': {
      const to: MoveDef = MOVES[offer.to]
      return { icon: moveIcon(offer.to), name: to.name, tag: 'EVOLUÇÃO!', isNew: true, desc: `${MOVES[offer.from].name} evolui! ${to.description}`, type: to.type }
    }
  }
}

export const levelUp = (root: HTMLElement, input: Input, g: Game, onChoose: (offer: Offer) => void): Screen => {
  const name = STARTERS[g.starter].line[g.player.stage]!.name
  const buttons = g.offers.map((offer, i) => {
    const v = offerView(g, offer)
    const recipes = offerRecipes(g, offer)
    return h(
      'button',
      { class: offer.kind === 'evolution' ? 'offer offer-evo' : 'offer' },
      h('span', { class: 'offer-key' }, i + 1),
      h('div', { class: 'offer-icon' }, h('img', { src: v.icon, alt: '' })),
      h(
        'div',
        { class: 'offer-body' },
        h('div', { class: 'offer-name' }, v.name, v.tag && h('span', { class: v.isNew ? 'tag tag-new' : 'tag' }, v.tag)),
        h('div', { class: 'offer-desc' }, v.desc),
        recipes.length > 0 && h('div', { class: 'evo-recipes' }, ...recipes),
      ),
      v.type && typeBadge(v.type),
    )
  })

  let done = false
  const nav = menu(input, buttons, (i) => {
    if (done) return
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
      h('p', { class: 'hint' }, '↑ ↓ escolher · ENTER confirmar · 1-3 atalho'),
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

/** Paired item hint for a loadout move: shows what it needs and whether it is ready. */
const loadoutHint = (g: Game, id: MoveId) => {
  if (evolvedFrom(id)) return h('span', { class: 'tag tag-new' }, '★ EVO')
  const evo = evolutionOf(id)
  if (!evo) return null
  const ready = canEvolve(evo, g.player)
  return h(
    'span',
    { class: ready ? 'evo-pair ready' : 'evo-pair', title: `${ITEMS[evo.item].name} → ${MOVES[evo.to].name}` },
    h('img', { src: itemIcon(evo.item), alt: ITEMS[evo.item].name }),
    ready && '!',
  )
}

const loadoutList = (g: Game) =>
  h(
    'div',
    { class: 'loadout-list' },
    ...g.player.moves.map((m) =>
      h(
        'div',
        { class: 'loadout-row' },
        h('img', { src: moveIcon(m.id), alt: '' }),
        MOVES[m.id].name,
        loadoutHint(g, m.id),
        !evolvedFrom(m.id) && h('span', { class: 'tag' }, `Nv ${m.level}`),
      ),
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
      h('p', { class: 'evo-legend' }, 'Golpe no nível máximo + o item indicado = evolução na próxima Poké Ball ou subida de nível!'),
      h('div', { class: 'buttons' }, resume, mute, quit),
    ),
  )
  root.append(el)
  return { el, dispose: () => (nav.off(), offEsc(), el.remove()) }
}

/* ---------------- Results ---------------- */

export const results = (root: HTMLElement, input: Input, g: Game, onRetry: () => void, onMenu: () => void): Screen => {
  const victory = g.phase === 'victory'
  const name = STARTERS[g.starter].line[g.player.stage]!.name
  const entries = (Object.entries(g.damageByMove) as Array<[MoveId, number]>).sort((a, b) => b[1] - a[1])
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
      h('img', { class: 'result-portrait', src: sprites(playerDex(g)).portrait.src, alt: '' }),
      h('div', { class: 'dialog-title' }, victory ? 'Você venceu Mewtwo!' : `${name} desmaiou!`),
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
        ...entries.map(([id, dmg]) =>
          h(
            'div',
            { class: 'damage-row' },
            h('img', { src: moveIcon(id), alt: '' }),
            h('span', { class: 'damage-name' }, MOVES[id].name),
            h('div', { class: 'damage-bar' }, h('div', { style: `width:${(dmg / top) * 100}%;--type:${TYPE_COLORS[MOVES[id].type]}` })),
            h('b', {}, Math.round(dmg).toLocaleString('pt-BR')),
          ),
        ),
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
