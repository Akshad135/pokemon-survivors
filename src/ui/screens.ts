import { formatTime } from '../engine/math'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { canEvolve, EVOLUTIONS, evolutionOf, evolvedFrom, type MoveEvolution } from '../data/evolutions'
import { ENEMIES } from '../data/enemies'
import { ITEMS } from '../data/items'
import { PLAYABLE } from '../data/hatchlings'
import { TYPE_COLORS, type PokeType } from '../data/types'
import { forkAt, isLegendary, maxMoveLevel, MOVES, moveStats, type MoveDef, type MoveId } from '../game/moves'
import { canBanish, drafting, playerDex } from '../game/game'
import { rarityOf } from '../game/leveling'
import { fusable, isDuo, reachableDuos, readyDuos, type DuoRecipe } from '../game/duoRules'
import { CURSES } from '../data/curses'
import { modsOf, type ModId } from '../game/mods'
import { playerForm } from '../game/branch'
import { runLearnset, unlockedAt } from '../game/learnsets'
import { ABILITIES, isHidden } from '../data/abilities'
import { abilitySet } from '../game/abilities'
import { heldMega } from '../game/mega'
import { megaIcon } from '../render/megaFx'
import { BRANCHES } from '../data/branches'
import { abilityIcon } from '../render/abilityArt'
import type { Difficulty } from '../game/difficulty'
import { toSteps } from '../game/eggs'
import { overtime } from '../game/endless'
import { runEarnings } from '../game/meta'
import { resolveSpecial } from '../game/special'
import type { DamageSource, Game, Offer } from '../game/types'
import { berryIcon, coinIcon, curseIcon, eggIcon, itemIcon, moveIcon, sparkleIcon } from '../render/art'
import { modIcon } from '../render/modFx'
import { specialIcon } from '../render/specialFx'
import { portraitUrl, sprites } from '../render/sprites'
import { formatNumber, formatPokeDollars, locale, t, type Messages } from '../i18n'
import { ROUTES } from '../site/routes'
import { h, later } from './dom'
import { boundPadHint, glyphText } from './inputLabels'

export type Screen = {
  el: HTMLElement
  tick?: (t: number) => void
  dispose: () => void
  /** How much the attract-mode meadow behind the screen is darkened (0..1, default 0.35). */
  dim?: number
}

export const typeBadge = (type: PokeType) => h('span', { class: 'type-badge', style: `--type:${TYPE_COLORS[type]}` }, type.toUpperCase())

/** The level a run is played on, as a colored chip (pause menu, results). */
export const difficultyTag = (d: Difficulty) => h('span', { class: `difficulty-tag ${d}` }, t().difficulty.names[d])

/** Taps this soon after a menu opens are ignored: a thumb still steering the joystick shouldn't pick an upgrade. */
const TAP_GUARD_MS = 350

/**
 * Hint that swaps between keyboard, gamepad and touch wording (see `.keys-only`,
 * `.pad-only` and `.touch-only` in CSS). The gamepad's is the keyboard's with
 * the pad's buttons (`boundPadHint`).
 */
export const hint = (keys: string, touch: string) =>
  h(
    'p',
    { class: 'hint' },
    h('span', { class: 'keys-only' }, ...glyphText(keys)),
    h('span', { class: 'pad-only' }, ...glyphText(boundPadHint(keys))),
    h('span', { class: 'touch-only' }, touch),
  )

/**
 * Shared keyboard/pointer navigation for a list of buttons.
 * Arrows move the cursor, Enter/Space activate, digits pick directly.
 */
export const menu = (input: Input, buttons: HTMLElement[], activate: (i: number) => void, opts: { horizontal?: boolean; initial?: number } = {}) => {
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
    ready && h('b', {}, t().levelUp.ready),
  )

/** "Ember + Razor Leaf → Fire Pledge" chip of a fusion on the table. */
const duoChip = (from: readonly [MoveId, MoveId], to: MoveId) =>
  h(
    'span',
    { class: 'evo-recipe duo-recipe ready', title: `${MOVES[from[0]].name} + ${MOVES[from[1]].name} → ${MOVES[to].name}` },
    h('img', { src: moveIcon(from[0]), alt: '' }),
    '+',
    h('img', { src: moveIcon(from[1]), alt: '' }),
    '→',
    h('img', { src: moveIcon(to), alt: '' }),
  )

/** "FIRE + GRASS → Fire Pledge" chip of a recipe, by type. `state` lights it up when ready, or marks the one fused. */
const recipeChip = (r: DuoRecipe, state: 'ready' | 'done' | null, to: MoveId = r.to) => {
  const m = t()
  return h(
    'span',
    { class: `duo-type-recipe${state ? ` ${state}` : ''}`, title: `${m.types[r.types[0]]} + ${m.types[r.types[1]]} → ${MOVES[to].name}` },
    typeBadge(r.types[0]),
    '+',
    typeBadge(r.types[1]),
    '→',
    h('img', { src: moveIcon(to), alt: '' }),
    // Only the one on the table (or fused) spells its name: the rest stay compact.
    state && h('span', { class: 'duo-type-name' }, MOVES[to].name),
    state && h('b', {}, state === 'ready' ? m.levelUp.ready : m.duo.done),
  )
}

/** Recipes an offer takes part in, flagged ready if picking it completes the pair. */
const offerRecipes = (g: Game, offer: Offer) => {
  const p = g.player
  switch (offer.kind) {
    case 'move': {
      const evo = evolutionOf(offer.id)
      const evos = evo ? [evoRecipe(evo, canEvolve(evo, { moves: [{ ...offer, cooldown: 0 }], items: p.items }))] : []
      // Reaching max level makes it a duo ingredient: the fusions it would open show up.
      if (offer.level < maxMoveLevel(offer.id) || isDuo(offer.id)) return evos
      const moves = [...p.moves.filter((o) => o.id !== offer.id), { id: offer.id, level: offer.level, cooldown: 0 }]
      const duos = readyDuos(moves).filter((d) => d.from.includes(offer.id) && !readyDuos(p.moves).some((r) => r.to === d.to))
      return [...evos, ...duos.map((d) => duoChip(d.from, d.to))]
    }
    case 'duo':
      return [duoChip(offer.from, offer.to)]
    case 'item': {
      const learnset = runLearnset(g.starter, g.branch)
      return EVOLUTIONS.filter((e) => e.item === offer.id && learnset.includes(e.from)).map((e) =>
        evoRecipe(e, canEvolve(e, { moves: p.moves, items: [offer] })),
      )
    }
    default:
      return []
  }
}

/** The texts of the upgrade step to `level`: a line, or a fork's two branches. */
const stepText = (id: MoveId, level: number) => t().moves[id].upgrades[level - 2]

/** One line of a plain step (a fork's own line is its branches' hint). */
const stepLine = (id: MoveId, level: number) => {
  const text = stepText(id, level)
  if (text === undefined) return ''
  return typeof text === 'string' ? text : t().levelUp.forkHint(text.fork[0].name, text.fork[1].name)
}

const offerView = (g: Game, offer: Offer) => {
  const m = t()
  const rare = rarityOf(offer) === 'rare'
  switch (offer.kind) {
    case 'move': {
      const def: MoveDef = MOVES[offer.id]
      const isNew = offer.level === 1 || (rare && offer.level === 2)
      const first = isNew ? m.moves[offer.id].description : stepLine(offer.id, rare ? offer.level - 1 : offer.level)
      return {
        icon: moveIcon(offer.id),
        name: def.name,
        tag: `${evolvedFrom(offer.id) || isLegendary(offer.id) ? '★ ' : isDuo(offer.id) ? '✦ ' : ''}${isNew && !rare ? m.new : offer.level === maxMoveLevel(offer.id) ? m.max : m.level(offer.level)}`,
        isNew,
        desc: rare ? `${first} · ${stepLine(offer.id, offer.level)}` : first,
        type: def.type,
        fork: forkAt(offer.id, offer.level) !== null,
        mods: NO_MODS,
      }
    }
    case 'branch': {
      const def: MoveDef = MOVES[offer.id]
      const text = stepText(offer.id, offer.level)
      const branch = typeof text === 'object' ? text.fork[offer.branch] : null
      const mods = forkAt(offer.id, offer.level)?.[offer.branch].mods ?? NO_MODS
      return { icon: moveIcon(offer.id), name: branch?.name ?? def.name, tag: '', isNew: false, desc: branch?.desc ?? '', type: def.type, fork: false, mods }
    }
    case 'item': {
      const isNew = offer.level === 1
      // A rare card stacks two levels of the item.
      const desc = rare ? `${m.items[offer.id]} x2` : m.items[offer.id]
      return { icon: itemIcon(offer.id), name: ITEMS[offer.id].name, tag: isNew && !rare ? m.new : m.level(offer.level), isNew, desc, type: null, fork: false, mods: NO_MODS }
    }
    case 'berry':
      return { icon: berryIcon(), name: 'Oran Berry', tag: '', isNew: false, desc: m.levelUp.berry(PLAYABLE[g.starter].name), type: null, fork: false, mods: NO_MODS }
    case 'evolution': {
      const to: MoveDef = MOVES[offer.to]
      const desc = m.levelUp.evolves(MOVES[offer.from].name, m.moves[offer.to].description)
      return { icon: moveIcon(offer.to), name: to.name, tag: m.levelUp.evolution, isNew: true, desc, type: to.type, fork: false, mods: NO_MODS }
    }
    case 'duo': {
      const to: MoveDef = MOVES[offer.to]
      // The recipe chip under it shows the two moves it spends.
      return { icon: moveIcon(offer.to), name: to.name, tag: m.duo.tag, isNew: true, desc: m.moves[offer.to].description, type: to.type, fork: false, mods: NO_MODS }
    }
    // Cursed items, branches and abilities have screens of their own (`ui/cursePick.ts`, `ui/abilityPick.ts`); this is their plain row.
    case 'curse':
      return { icon: curseIcon(offer.id), name: CURSES[offer.id].name, tag: offer.take ? m.curse.take : m.curse.leave, isNew: false, desc: m.curses[offer.id].upside, type: null, fork: false, mods: NO_MODS }
    // Branches and abilities have screens of their own (`ui/abilityPick.ts`); this is their plain row.
    case 'form': {
      const b = BRANCHES[offer.id]
      return { icon: portraitUrl(b.dex), name: b.name, tag: '', isNew: false, desc: m.branch.subtitle, type: b.types[0] ?? null, fork: false, mods: NO_MODS }
    }
    case 'ability':
      return { icon: abilityIcon(offer.id), name: ABILITIES[offer.id].name, tag: offer.hidden ? m.ability.hidden : '', isNew: offer.hidden, desc: m.abilities[offer.id], type: null, fork: false, mods: NO_MODS }
    // TM picks have their own screen too (`ui/tmPick.ts`).
    case 'tm':
    case 'forget': {
      const def: MoveDef = MOVES[offer.id]
      return { icon: moveIcon(offer.id), name: def.name, tag: m.tm.tag, isNew: offer.kind === 'tm', desc: m.moves[offer.id].description, type: def.type, fork: false, mods: NO_MODS }
    }
    case 'pass':
      return { icon: berryIcon(), name: m.tm.pass, tag: '', isNew: false, desc: '', type: null, fork: false, mods: NO_MODS }
  }
}

const NO_MODS: readonly ModId[] = []

/** Twinkles scattered over a shiny card's frame, as [left %, top %, delay s] (CSS animates them). */
const SPARKLES = [
  [6, 12, 0],
  [88, 8, 0.5],
  [95, 68, 1.1],
  [32, 82, 0.8],
  [62, 4, 1.5],
] as const

/** Fills a level-up card (a persistent button, so a forgotten card's slot keeps its place in the menu). */
const fillCard = (g: Game, button: HTMLElement, offer: Offer, i: number) => {
  const m = t().levelUp
  const v = offerView(g, offer)
  const recipes = offerRecipes(g, offer)
  const rarity = rarityOf(offer)
  // A move the evolution just unlocked, while it still comes up more often: tagged with the form that learns it.
  const fresh =
    offer.kind === 'move' && g.freshMoves > 0 && !g.player.moves.some((m) => m.id === offer.id) && unlockedAt(g.starter, g.branch, g.player.stage).includes(offer.id)
  const classes = [
    'offer',
    offer.kind === 'evolution' && 'offer-evo',
    // An evolved move's level-up shows in gold, a notch under an evolution.
    offer.kind === 'move' && (evolvedFrom(offer.id) || isDuo(offer.id)) && 'offer-star',
    offer.kind === 'duo' && 'offer-duo',
    offer.kind === 'branch' && `offer-branch branch-${offer.branch === 0 ? 'a' : 'b'}`,
    v.fork && 'offer-fork',
    rarity && `offer-${rarity}`,
    !canBanish(offer) && 'offer-keep',
    fresh && 'offer-fresh',
  ]
  button.className = classes.filter(Boolean).join(' ')
  button.style.setProperty('--i', String(i))
  // A duo card wears both ingredients' type colors.
  if (offer.kind === 'duo') {
    button.style.setProperty('--duo-a', TYPE_COLORS[MOVES[offer.from[0]].type])
    button.style.setProperty('--duo-b', TYPE_COLORS[MOVES[offer.from[1]].type])
  }
  // `h` drops the parts a card doesn't have; the button takes what's left.
  const parts = h(
    'div',
    {},
    h('span', { class: 'offer-key' }, offer.kind === 'branch' ? (offer.branch === 0 ? 'A' : 'B') : i + 1),
    h(
      'div',
      { class: 'offer-icon' },
      h('img', { src: v.icon, alt: '' }),
      v.mods.length > 0 && h('span', { class: 'offer-mods' }, ...v.mods.map((id) => h('img', { src: modIcon(id), alt: '' }))),
    ),
    h(
      'div',
      { class: 'offer-body' },
      h(
        'div',
        { class: 'offer-name' },
        v.name,
        v.tag && h('span', { class: v.isNew ? 'tag tag-new' : 'tag' }, v.tag),
        v.fork && h('span', { class: 'tag tag-fork' }, m.forkTag),
        fresh && h('span', { class: 'tag tag-fresh' }, m.freshTag(playerForm(g).name)),
        rarity && h('span', { class: `tag tag-${rarity}` }, rarity === 'rare' ? m.rare : m.shiny),
      ),
      h('div', { class: 'offer-desc' }, v.desc),
      rarity === 'shiny' && h('div', { class: 'offer-note' }, m.shinyNote),
      offer.kind === 'duo' && h('div', { class: 'offer-note duo-note' }, t().duo.frees),
      recipes.length > 0 && h('div', { class: 'evo-recipes' }, ...recipes),
    ),
    v.type && typeBadge(v.type),
    (rarity || offer.kind === 'duo') && h('span', { class: 'offer-shine', 'aria-hidden': 'true' }),
    rarity === 'shiny' &&
      h(
        'span',
        { class: 'offer-sparkles', 'aria-hidden': 'true' },
        ...SPARKLES.map(([x, y, delay]) => h('img', { src: sparkleIcon(), alt: '', style: `left:${x}%;top:${y}%;animation-delay:${delay}s` })),
      ),
  )
  button.replaceChildren(...parts.childNodes)
}

/**
 * What the level-up screen can do besides picking: the Poké Mart charges and
 * Esquecer (`banish` forgets the card at an index; the run redraws that slot in place).
 */
type LevelUpExtras = { reroll: () => void; skip: () => void; banish: (index: number) => void }

/**
 * The level-up screen, in three guises: the opening draft (the move after the
 * signature), a fork (a move card split into its two branches, A and B) and a
 * regular level-up, where Esquecer turns the next pick into forgetting a card:
 * it flies off and its slot is drawn again.
 */
export const levelUp = (root: HTMLElement, input: Input, g: Game, onChoose: (offer: Offer) => void, extras?: LevelUpExtras): Screen => {
  const m = t().levelUp
  const name = playerForm(g).name
  const fork = g.offers.find((o) => o.kind === 'branch')
  const buttons = g.offers.map((offer, i) => {
    const button = h('button', {})
    fillCard(g, button, offer, i)
    return button
  })

  const charge = (left: number, label: string, cls = 'btn') => (extras && !fork && left > 0 ? h('button', { class: cls }, label) : null)
  const reroll = charge(g.rerolls, m.reroll(g.rerolls))
  const skip = charge(g.skips, m.skip(g.skips))
  const banish = charge(g.banishes, m.banish(g.banishes), 'btn btn-banish')
  const actions = [reroll, skip, banish].filter((b) => b !== null)

  const offersEl = h('div', { class: fork ? 'offers branches' : 'offers' }, ...buttons)
  const hintEl = h('div', { class: 'hint-slot' }, hint(fork ? m.pairHintKeys : m.hintKeys, m.hintTouch))
  let banishing = false
  const setBanishing = (on: boolean) => {
    banishing = on
    offersEl.classList.toggle('banishing', on)
    banish?.classList.toggle('active', on)
    if (banish) banish.textContent = on ? m.banishCancel : m.banish(g.banishes)
    hintEl.replaceChildren(on ? hint(m.banishHintKeys, m.banishHintTouch) : hint(m.hintKeys, m.hintTouch))
  }

  /** The card at `i` flies off as a ghost while its slot fills with the card drawn in its place. */
  const forget = (i: number) => {
    const button = buttons[i]!
    const ghost = button.cloneNode(true) as HTMLElement
    ghost.classList.add('offer-ghost')
    ghost.classList.remove('selected')
    Object.assign(ghost.style, { top: `${button.offsetTop}px`, left: `${button.offsetLeft}px`, width: `${button.offsetWidth}px`, height: `${button.offsetHeight}px` })
    offersEl.append(ghost)
    ghost.addEventListener('animationend', () => ghost.remove())
    extras?.banish(i)
    fillCard(g, button, g.offers[i]!, i)
    button.classList.add('offer-redrawn', 'selected')
    playSfx('escaped')
    setBanishing(false)
    if (g.banishes <= 0) banish?.remove()
  }

  let done = false
  // Space also fires the special attack: ignore presses that were meant for the fight.
  const openedAt = performance.now()
  const nav = menu(input, [...buttons, ...actions], (i) => {
    if (done || performance.now() - openedAt < 400) return
    const offer = g.offers[i]
    const action = actions[i - buttons.length]
    if (banishing && offer) return canBanish(offer) ? forget(i) : playSfx('denied')
    if (action && action === banish) {
      playSfx('move')
      return setBanishing(!banishing)
    }
    done = true
    playSfx('select')
    if (offer) onChoose(offer)
    else if (action === reroll) extras?.reroll()
    else if (action === skip) extras?.skip()
  })
  const offEscape = input.onKey((key) => {
    if (key === 'Escape' && banishing) setBanishing(false)
    // A fork's two paths sit side by side (stacked only on a phone held upright): left and right move too.
    else if (fork && (key === 'ArrowLeft' || key === 'KeyA')) nav.focus(nav.index - 1)
    else if (fork && (key === 'ArrowRight' || key === 'KeyD')) nav.focus(nav.index + 1)
  })

  const title = fork ? m.forkTitle(MOVES[fork.id].name, fork.level) : drafting(g) ? m.draftTitle(name) : m.title(name, g.player.level - g.pendingLevelUps + 1)
  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: fork ? 'dialog box pop levelup fork' : 'dialog box pop levelup' },
      h('div', { class: 'dialog-title' }, title),
      offersEl,
      actions.length > 0 && h('div', { class: 'buttons' }, ...actions),
      hintEl,
    ),
  )
  root.append(el)
  return { el, dispose: () => (nav.off(), offEscape(), el.remove()) }
}

/* ---------------- Pause ---------------- */

const STAT_ROWS = [
  ['damage', (s: Game['player']['stats']) => `x${s.might.toFixed(2)}`],
  ['area', (s) => `x${s.area.toFixed(2)}`],
  ['cooldown', (s) => `x${s.cooldown.toFixed(2)}`],
  ['duration', (s) => `x${s.duration.toFixed(2)}`],
  ['amount', (s) => `+${s.amount}`],
  ['speed', (s) => `${Math.round(s.speed)}`],
  ['defense', (s) => `${s.armor}`],
  ['regen', (s) => `${s.regen.toFixed(1)}/s`],
] as const satisfies ReadonlyArray<readonly [keyof Messages['stats'], (s: Game['player']['stats']) => string]>

/** Paired item hint for a loadout move: shows what it needs and whether it is ready. */
const loadoutHint = (g: Game, id: MoveId) => {
  if (evolvedFrom(id)) return h('span', { class: 'tag tag-new' }, '★ EVO')
  if (isDuo(id)) return h('span', { class: 'tag tag-duo' }, '✦ DUO')
  // A legendary's move never evolves: a gold star says where it came from.
  if (isLegendary(id)) return h('span', { class: 'tag tag-legendary' }, '★')
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
        // The mods of the fork branches taken.
        ...modsOf(moveStats(m.id, m.level, g.player.stats, m.path).mods).map((id) => h('img', { class: 'loadout-mod', src: modIcon(id), alt: '' })),
        loadoutHint(g, m.id),
        h('span', { class: 'tag' }, t().level(m.level)),
      ),
    ),
    ...g.player.items.map((i) =>
      h('div', { class: 'loadout-row' }, h('img', { src: itemIcon(i.id), alt: '' }), ITEMS[i.id].name, h('span', { class: 'tag' }, t().level(i.level))),
    ),
    ...g.curses.held.map((id) =>
      h('div', { class: 'loadout-row cursed', title: t().curses[id].downside }, h('img', { src: curseIcon(id), alt: '' }), CURSES[id].name, h('span', { class: 'tag tag-curse' }, t().curse.label)),
    ),
  )

/**
 * The duo recipes this run can make (both types among the moves it can learn
 * or holds), lit when ready; once one is fused, just that one, marked done.
 */
const duoPanel = (g: Game) => {
  const m = t().duo
  const p = g.player
  const owned = p.moves.find((o) => isDuo(o.id))
  const types = new Set<PokeType>([...runLearnset(g.starter, g.branch), ...p.moves.map((o) => o.id)].map((id) => MOVES[id].type))
  const ready = readyDuos(p.moves)
  const recipes = reachableDuos(types)
  if (recipes.length === 0 && !owned) return null
  const chips = owned
    ? recipes.filter((r) => r.to === owned.id || ('alt' in r && r.alt === owned.id)).map((r) => recipeChip(r, 'done', owned.id))
    : recipes.map((r) => {
        const fused = ready.find((d) => d.to === r.to || ('alt' in r && d.to === r.alt))
        return recipeChip(r, fused ? 'ready' : null, fused?.to)
      })
  const half = p.moves.filter(fusable).length > 0
  return h(
    'div',
    { class: 'duo-panel' },
    h('div', { class: 'duo-recipes' }, h('span', { class: 'duo-panel-title' }, h('img', { src: sparkleIcon(), alt: '' }), m.title), ...chips),
    !owned && h('p', { class: half ? 'duo-legend near' : 'duo-legend' }, m.legend),
  )
}

/** The ability in play for the pause menu: the one picked (its Hidden tag too), the Mega's while that lasts, or when it comes. */
const abilityPanel = (g: Game) => {
  const m = t().ability
  const mega = g.mega.active > 0 ? heldMega(g) : null
  const id = g.ability.id
  const row = (cls: string, icon: string, name: Node | string, text: string) =>
    h('div', { class: `pause-ability ${cls}` }, h('img', { src: icon, alt: '' }), h('div', {}, h('b', {}, h('small', {}, m.label), name), h('span', {}, text)))
  if (mega) return row('mega', megaIcon(), mega.ability, m.megaNote)
  if (!id) return row('pending', sparkleIcon(), '—', m.pending)
  const set = abilitySet(g.starter, g.branch)
  const hidden = isHidden(set, set.indexOf(id))
  return row(hidden ? 'hidden-ability' : '', abilityIcon(id), h('span', {}, ABILITIES[id].name, hidden && h('span', { class: 'tag tag-hidden' }, m.hidden)), t().abilities[id])
}

/**
 * `settings` opens the settings screen on top (see `openSettings`) and must
 * call `back` once it closes; the pause menu hides meanwhile, then redraws
 * itself, in the new language if it changed.
 */
type PauseActions = { resume: () => void; quit: () => void; settings: (back: () => void) => Screen }

export const pauseMenu = (root: HTMLElement, input: Input, g: Game, actions: PauseActions): Screen => {
  const el = h('div', { class: 'screen dim' })
  let nav: ReturnType<typeof menu> | null = null
  let settings: Screen | null = null

  const openSettings = () => {
    if (settings) return
    nav?.off()
    el.classList.add('hidden')
    settings = actions.settings(() => {
      settings = null
      el.classList.remove('hidden')
      render(1, false)
    })
  }

  /** `opening` plays the pop-in; redraws after closing the settings don't. */
  const render = (focus: number, opening: boolean) => {
    const m = t().pause
    const resume = h('button', { class: 'btn' }, m.resume)
    const settingsButton = h('button', { class: 'btn' }, m.settings)
    const quit = h('button', { class: 'btn' }, m.quit)
    nav?.off()
    nav = menu(input, [resume, settingsButton, quit], (i) => {
      if (i === 0) actions.resume()
      // Open after this key dispatch, or the settings would receive the same Enter.
      if (i === 1) later(openSettings)
      if (i === 2) actions.quit()
    }, { initial: focus })
    const s = g.player.stats
    el.replaceChildren(
      h(
        'div',
        { class: opening ? 'dialog box pop wide pause-box' : 'dialog box wide pause-box' },
        h('div', { class: 'dialog-title' }, m.title),
        difficultyTag(g.difficulty),
        abilityPanel(g),
        h(
          'div',
          { class: 'pause-grid' },
          loadoutList(g),
          h('div', { class: 'stat-list' }, ...STAT_ROWS.map(([key, fmt]) => h('div', { class: 'stat-row' }, h('span', {}, t().stats[key]), h('b', {}, fmt(s))))),
        ),
        duoPanel(g),
        h('p', { class: 'evo-legend' }, m.evoLegend),
        h('div', { class: 'buttons' }, resume, settingsButton, quit),
      ),
    )
  }

  render(0, true)
  // Esc inside the settings only closes them.
  const offEsc = input.onKey((k) => k === 'Escape' && !settings && actions.resume())
  root.append(el)
  return { el, dispose: () => (settings?.dispose(), nav?.off(), offEsc(), el.remove()) }
}

/* ---------------- Results ---------------- */

/** Icon, name and type for a results-screen damage row (and the run's share card). */
export const damageSource = (g: Game, id: DamageSource) => {
  if (id === 'ability') {
    const ability = g.ability.id
    const type = playerForm(g).types[0] ?? 'normal'
    return ability ? { icon: abilityIcon(ability), name: ABILITIES[ability].name, type } : { icon: sparkleIcon(), name: t().ability.results, type }
  }
  if (id !== 'special') return { icon: moveIcon(id), name: MOVES[id].name, type: MOVES[id].type }
  const r = resolveSpecial(g.starter, g.player.stage, null, g.branch)
  return { icon: specialIcon(r.id), name: r.tier.name, type: r.def.type }
}

/** What the incubator made of the run: ₽ paid for eggs that didn't fit, and eggs now ready to hatch. */
export type ResultEggs = { refund: number; ready: number }

/** What the run added to the Pokédex (`dexNews`). */
type DexNews = { species: number; shinies: number }

/** The run's ranking line (`rankPanel`) and the boards, opened over the results until `back`. */
type ResultsRanking = { panel: HTMLElement; open: (back: () => void) => Screen }

/** The share preview of the run's card, opened over the results until `back`; `glow` when the run is worth showing off. */
type ResultsShare = { open: (back: () => void) => Screen; glow: boolean }

/**
 * What the shell adds to the results: the equipped title, the missions the run
 * moved and the medals it earned (built by `ui/missions.ts`), the incubator,
 * the Pokédex news and the ranking.
 */
type ResultsExtras = {
  badge: HTMLElement | null
  report: HTMLElement | null
  medals: readonly HTMLElement[]
  eggs: ResultEggs
  news: DexNews
  ranking: ResultsRanking | null
  share: ResultsShare | null
  /** A victory's thanks to the supporters (`creditsLine`), above the support link. */
  credits?: HTMLElement | null
}

const NO_EXTRAS: ResultsExtras = { badge: null, report: null, medals: [], eggs: { refund: 0, ready: 0 }, news: { species: 0, shinies: 0 }, ranking: null, share: null }

/**
 * Everything new a run brought, as one wrapping line of chips under the stats
 * (Pokédex, eggs, medals), so the results stay short on a phone held upright.
 */
const runNews = ({ eggs, news, medals }: ResultsExtras) => {
  const m = t().results
  const e = t().eggs
  const chips = [
    (news.species > 0 || news.shinies > 0) &&
      h(
        'span',
        { class: 'news-chip dex-news' },
        h('b', {}, 'POKéDEX'),
        [news.species > 0 && m.dexSpecies(news.species), news.shinies > 0 && m.dexShinies(news.shinies)].filter(Boolean).join(' · '),
        news.shinies > 0 && h('img', { src: sparkleIcon(), alt: '' }),
      ),
    eggs.ready > 0 && h('span', { class: 'news-chip egg-ready' }, h('img', { src: eggIcon('common'), alt: '' }), e.readyBadge(eggs.ready)),
    eggs.refund > 0 && h('span', { class: 'news-chip' }, h('img', { src: coinIcon(1), alt: '' }), e.full(formatPokeDollars(eggs.refund))),
    ...medals,
  ].filter((chip) => chip instanceof HTMLElement)
  return chips.length > 0 ? h('div', { class: 'result-news' }, ...chips) : null
}

/**
 * End of run. On a victory, `onContinue` adds the endless-mode button (first);
 * a run that ends in endless mode shows its overtime, rift legendaries and Arceus.
 * The steps walked and eggs found feed the incubator (`extras.eggs`), and
 * `extras.news` adds a one-line Pokédex summary when the run found something new.
 * A victory also links the support page, under the buttons (only then, so it never nags).
 */
export const results = (
  root: HTMLElement,
  input: Input,
  g: Game,
  onRetry: () => void,
  onMenu: () => void,
  onContinue?: () => void,
  extras: ResultsExtras = NO_EXTRAS,
): Screen => {
  const m = t().results
  const e = t().eggs
  const r = t().rifts
  const victory = g.phase === 'victory'
  const name = playerForm(g).name
  const entries = (Object.entries(g.damageByMove) as Array<[DamageSource, number]>).sort((a, b) => b[1] - a[1])
  const top = entries[0]?.[1] ?? 1
  const earned = runEarnings(g)
  const extra = overtime(g.time)
  const reaperDefeats = g.endless?.reaperDefeats ?? 0
  const legends = g.rift.cleared
  const retry = h('button', { class: 'btn' }, m.retry)
  const back = h('button', { class: 'btn' }, m.change)
  const goOn = victory && onContinue ? h('button', { class: 'btn' }, r.continue) : null
  const ranking = extras.ranking
  const boards = ranking ? h('button', { class: 'btn' }, t().ranking.open) : null
  const share = extras.share ? h('button', { class: extras.share.glow ? 'btn share-button glow' : 'btn share-button' }, h('img', { src: sparkleIcon(), alt: '' }), t().share.button) : null
  /** The boards or the share preview, open over the results. */
  let sub: Screen | null = null
  /** Hides the results under `open`'s screen until it closes, then comes back on the same button. */
  const openSub = (open: ((back: () => void) => Screen) | undefined, button: HTMLButtonElement) => {
    if (!open) return
    nav.off()
    el.classList.add('hidden')
    sub = open(() => {
      sub = null
      el.classList.remove('hidden')
      nav = bindNav(buttons.indexOf(button))
    })
  }
  const buttons = [goOn, retry, back, share, boards].filter((b) => b !== null)
  const actions = [
    goOn && onContinue,
    onRetry,
    onMenu,
    share && (() => later(() => openSub(extras.share?.open, share))),
    boards && (() => later(() => openSub(ranking?.open, boards))),
  ].filter((a) => typeof a === 'function')
  const bindNav = (initial = 0) => menu(input, buttons, (i) => actions[i]?.(), { horizontal: true, initial })
  let nav = bindNav()

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
      h('div', { class: 'dialog-title' }, victory ? m.victory : g.endless ? r.endlessOver(name) : m.fainted(name)),
      extras.badge,
      g.player.shiny && h('div', { class: 'tag tag-shiny' }, m.shiny(name)),
      reaperDefeats > 0 && h('div', { class: 'tag tag-shiny' }, r.reaperDefeated(reaperDefeats)),
      h(
        'div',
        { class: 'result-stats' },
        h('div', {}, h('span', {}, t().difficulty.label), h('b', {}, difficultyTag(g.difficulty))),
        h('div', {}, h('span', {}, m.time), h('b', {}, formatTime(g.time))),
        extra > 0 && h('div', {}, h('span', {}, r.overtime), h('b', {}, `+${formatTime(extra)}`)),
        h('div', {}, h('span', {}, m.level), h('b', {}, g.player.level)),
        h('div', {}, h('span', {}, m.kills), h('b', {}, g.kills)),
        legends.length > 0 &&
          h('div', {}, h('span', {}, r.legends), h('b', { class: 'result-legends' }, ...legends.map((id) => h('img', { src: portraitUrl(ENEMIES[id].dex), alt: ENEMIES[id].name, title: ENEMIES[id].name })))),
        h('div', {}, h('span', {}, e.steps), h('b', {}, formatNumber(toSteps(g.player.walked)))),
        g.eggs.found.length > 0 &&
          h('div', {}, h('span', {}, e.eggs), h('b', { class: 'result-legends' }, ...g.eggs.found.map((egg) => h('img', { src: eggIcon(egg.tier), alt: e.tiers[egg.tier], title: e.tiers[egg.tier] })))),
      ),
      runNews(extras),
      ranking?.panel,
      goOn && h('p', { class: 'endless-hint' }, r.continueHint),
      h(
        'div',
        { class: 'earnings' },
        h('img', { src: coinIcon(2), alt: '' }),
        h('b', {}, `+${formatPokeDollars(earned.total)}`),
        h('span', {}, m.earnings(formatPokeDollars(earned.coins), formatPokeDollars(earned.bonus))),
      ),
      extras.report,
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
            h('b', {}, formatNumber(dmg)),
          )
        }),
      ),
      h('div', { class: 'buttons result-buttons' }, ...buttons),
      victory && extras.credits,
      victory && h('a', { class: 'support-link result-support', href: ROUTES.support[locale()], target: '_blank', rel: 'noopener' }, `♥ ${m.support}`),
    ),
  )
  root.append(el)
  return { el, dispose: () => (sub?.dispose(), nav.off(), el.remove()) }
}

/* ---------------- Text box & flash (toasts and banners: `toasts.ts`) ---------------- */

/** Bottom dialog box, Pokémon style. Returns a disposer. */
export const textBox = (root: HTMLElement, text: string) => {
  const el = h('div', { class: 'textbox box' }, h('p', {}, text))
  root.append(el)
  return () => el.remove()
}

/** Full-screen white flash that fades out by itself. */
export const flashScreen = (root: HTMLElement) => {
  const el = h('div', { class: 'screen-flash' })
  root.append(el)
  setTimeout(() => el.remove(), 1000)
}
