import { formatTime } from '../engine/math'
import { ENEMIES } from '../data/enemies'
import { STARTERS } from '../data/starters'
import { playerDex } from '../game/game'
import { MAX_ITEMS, MAX_MOVES } from '../game/leveling'
import type { Game } from '../game/types'
import { itemIcon, moveIcon, pokeballIcon, sparkleIcon } from '../render/art'
import { portraitUrl } from '../render/sprites'
import { h, setStyle, setText } from './dom'

const hpClass = (ratio: number) => (ratio > 0.5 ? 'hp-high' : ratio > 0.2 ? 'hp-mid' : 'hp-low')

/** In-run heads-up display. `update` is called every frame and only touches what changed. */
export const createHud = (root: HTMLElement) => {
  const xpFill = h('div', { class: 'xp-fill' })
  const xpLabel = h('div', { class: 'xp-label' })
  const timer = h('div', { class: 'timer' })
  const kills = h('span')
  const moveSlots = h('div', { class: 'slots' })
  const itemSlots = h('div', { class: 'slots' })
  const bossName = h('div', { class: 'boss-name' })
  const bossFill = h('div', { class: 'boss-fill' })
  const boss = h('div', { class: 'boss hidden' }, bossName, h('div', { class: 'boss-bar' }, bossFill))
  const portrait = h('img', { class: 'status-portrait', alt: '' })
  const shinyBadge = h('img', { class: 'shiny-badge hidden', src: sparkleIcon(), alt: 'Shiny' })
  const name = h('div', { class: 'status-name' })
  const level = h('div', { class: 'status-level' })
  const hpFill = h('div', { class: 'hp-fill' })
  const hpText = h('div', { class: 'status-hp-text' })

  const el = h(
    'div',
    { class: 'hud' },
    h('div', { class: 'xp' }, xpFill, xpLabel),
    h(
      'div',
      { class: 'hud-row' },
      h('div', { class: 'loadout' }, moveSlots, itemSlots),
      timer,
      h('div', { class: 'kills' }, h('img', { src: pokeballIcon(), alt: '' }), kills),
    ),
    boss,
    h(
      'div',
      { class: 'status box' },
      h('div', { class: 'portrait-wrap' }, portrait, shinyBadge),
      h(
        'div',
        { class: 'status-body' },
        h('div', { class: 'status-head' }, name, level),
        h('div', { class: 'status-hp' }, h('span', { class: 'hp-tag' }, 'HP'), h('div', { class: 'hp-bar' }, hpFill)),
        hpText,
      ),
    ),
  )
  root.append(el)

  let loadoutKey = ''
  let portraitKey = ''

  const renderSlots = (g: Game) => {
    const p = g.player
    moveSlots.replaceChildren(
      ...Array.from({ length: MAX_MOVES }, (_, i) => {
        const m = p.moves[i]
        return h('div', { class: 'slot' }, m && h('img', { src: moveIcon(m.id), alt: '' }), m && h('span', { class: 'slot-level' }, m.level))
      }),
    )
    itemSlots.replaceChildren(
      ...Array.from({ length: MAX_ITEMS }, (_, i) => {
        const it = p.items[i]
        return h('div', { class: 'slot item' }, it && h('img', { src: itemIcon(it.id), alt: '' }), it && h('span', { class: 'slot-level' }, it.level))
      }),
    )
  }

  const update = (g: Game) => {
    const p = g.player
    setStyle(xpFill, 'width', `${Math.min(100, (p.xp / p.xpNext) * 100).toFixed(1)}%`)
    setText(xpLabel, `Nv ${p.level}`)
    setText(timer, formatTime(g.time))
    setText(kills, String(g.kills))

    const key = [...p.moves.map((m) => `${m.id}${m.level}`), ...p.items.map((i) => `${i.id}${i.level}`)].join()
    if (key !== loadoutKey) {
      loadoutKey = key
      renderSlots(g)
    }

    const dex = playerDex(g)
    if (`${dex}${p.shiny}` !== portraitKey) {
      portraitKey = `${dex}${p.shiny}`
      portrait.setAttribute('src', portraitUrl(dex, p.shiny))
      shinyBadge.classList.toggle('hidden', !p.shiny)
      name.classList.toggle('shiny-name', p.shiny)
      setText(name, STARTERS[g.starter].line[p.stage]!.name)
    }
    setText(level, `Nv${p.level}`)
    const ratio = Math.max(0, p.hp / p.stats.maxHp)
    setStyle(hpFill, 'width', `${(ratio * 100).toFixed(1)}%`)
    hpFill.className = `hp-fill ${hpClass(ratio)}`
    setText(hpText, `${Math.ceil(p.hp)}/${Math.round(p.stats.maxHp)}`)

    const b = g.bossId !== null ? g.enemies.find((e) => e.id === g.bossId) : undefined
    boss.classList.toggle('hidden', !b)
    if (b) {
      setText(bossName, ENEMIES[b.kind].name)
      setStyle(bossFill, 'width', `${((b.hp / b.maxHp) * 100).toFixed(1)}%`)
    }
  }

  return { update, dispose: () => el.remove() }
}

export type Hud = ReturnType<typeof createHud>
