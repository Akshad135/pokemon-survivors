import { playCry, playSfx } from '../engine/audio'
import { ENEMIES } from '../data/enemies'
import { GRAVEYARD, PRETTY_WING_COINS, WINGS, type PlaceId, type WingId } from '../data/places'
import type { PlaceNotice } from '../game/place'
import { formatPokeDollars, t } from '../i18n'
import { pokeballIcon } from '../render/art'
import { cryUrl, portraitUrl } from '../render/sprites'
import { h, rich } from './dom'
import { flashScreen } from './screens'
import { banner, toast } from './toasts'

/** The number each wing's line shows, from its stats in `WINGS`. */
const wingAmount = (id: WingId) => {
  const s: { maxHp?: number; might?: number; armor?: number; speed?: number } = WINGS[id].stats
  switch (id) {
    case 'healthWing':
      return s.maxHp ?? 0
    case 'muscleWing':
      return Math.round((s.might ?? 0) * 100)
    case 'resistWing':
      return s.armor ?? 0
    case 'swiftWing':
      return s.speed ?? 0
    case 'prettyWing':
      return PRETTY_WING_COINS
  }
}

const SPIRITOMB_DEX = ENEMIES[GRAVEYARD.boss].dex

/** Sounds, toasts and banners for whatever just happened at a place (the dungeon's floor card is the HUD's, `ui/placeCard.ts`). */
export const placeFeedback = (root: HTMLElement, place: PlaceId, notice: PlaceNotice) => {
  const m = t().places
  switch (notice.kind) {
    case 'open':
      playSfx('shiny')
      return toast(root, rich(m.open[place]), 3400, 'place')
    case 'sealed':
      return toast(root, m.sealed[place], 2200, 'place')
    case 'blocked':
      playSfx('denied')
      return toast(root, rich(m.blocked), 2600, 'place')
    case 'enter':
      playSfx(place === 'sky' ? 'evolve' : 'item')
      if (place === 'sky') flashScreen(root)
      return banner(root, h('span', { class: 'biome-banner' }, h('small', {}, rich(m.goal[place])), h('b', {}, m.names[place])), 3200)
    case 'floor':
      return playSfx('select')
    case 'wind':
      playSfx(notice.level >= 3 ? 'quake' : 'tick')
      return toast(root, m.wind[notice.level - 1] ?? '', 2800, 'wind')
    case 'monsterHouse':
      playSfx('ambush')
      return toast(root, rich(m.monsterHouse), 2800)
    case 'chestTick':
      return playSfx('tick', 60)
    case 'treasure':
      playSfx('unlock')
      return toast(root, h('span', { class: 'item-toast' }, h('img', { src: pokeballIcon(), alt: '' }), rich(m.treasure(formatPokeDollars(notice.coins)))), 3200)
    case 'spirit':
      return playSfx('sip', 90)
    case 'keystone':
      playSfx('legendary')
      playCry(cryUrl(SPIRITOMB_DEX), 0.7)
      flashScreen(root)
      return banner(root, rich(notice.shiny ? m.keystoneShiny : m.keystone))
    case 'spiritomb':
      playSfx('evolve')
      return toast(root, h('span', { class: 'item-toast' }, h('img', { src: portraitUrl(SPIRITOMB_DEX, notice.shiny), alt: '' }), rich(m.spiritomb)), 3500)
    case 'warn':
      return toast(root, place === 'graveyard' ? m.dawnSoon : m.calmSoon, 2600, 'place')
    case 'wing':
      playSfx('item')
      return toast(root, h('span', { class: 'item-toast' }, h('b', {}, WINGS[notice.wing].name), m.wings[notice.wing](wingAmount(notice.wing))), 2200, notice.wing)
    case 'flock':
      return
    case 'landed':
      return toast(root, m.landed(notice.wings), 3000, 'place')
    case 'exit':
      if (notice.outcome !== 'timeout') return
      if (place === 'cave') {
        playSfx('quake')
        return toast(root, m.blownOut, 3000, 'place')
      }
      if (place === 'graveyard') return toast(root, m.dawn, 3000, 'place')
      return
  }
}
