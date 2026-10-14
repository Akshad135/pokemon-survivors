import { playCry, playSfx } from '../engine/audio'
import { BUFFS } from '../data/consumables'
import type { MapEventNotice } from '../game/mapEvents'
import { MEOWTH_DEX } from '../game/mapEventRules'
import { formatPokeDollars, t } from '../i18n'
import { coinIcon, pokeballIcon } from '../render/art'
import { fountainIcon } from '../render/mapEvents'
import { consumableIcon } from '../render/props'
import { cryUrl, portraitUrl } from '../render/sprites'
import { h, rich } from './dom'
import { toast } from './toasts'

/** Toast with a small icon on the left, like the item pickups. */
const iconToast = (root: HTMLElement, icon: string, text: string, ms = 2600) =>
  toast(root, h('span', { class: 'item-toast' }, h('img', { src: icon, alt: '' }), rich(text)), ms)

/** Sounds and toasts for whatever just happened at a map event. */
export const mapEventFeedback = (root: HTMLElement, notice: MapEventNotice) => {
  const m = t().mapEvents
  switch (notice.kind) {
    case 'altar':
      playSfx('altar')
      return iconToast(root, consumableIcon(notice.buff), m.altar(BUFFS[notice.buff].name))
    case 'fountain':
      playSfx('heal')
      return iconToast(root, fountainIcon(), m.fountain)
    case 'sip':
      return playSfx('sip', 120)
    case 'chestAmbush':
      playSfx('ambush')
      return toast(root, rich(m.chestAmbush), 2800)
    case 'chestTick':
      return playSfx('tick', 60)
    case 'chestOpen':
      playSfx('unlock')
      return iconToast(root, pokeballIcon(), m.chestOpen(formatPokeDollars(notice.coins)), 3000)
    case 'spikes':
      return playSfx('spikes', 150)
    case 'fuse':
      return playSfx('fuse', 300)
    case 'boom':
      return playSfx('explosion', 120)
    case 'meowth':
      playCry(cryUrl(MEOWTH_DEX), 0.4)
      return iconToast(root, portraitUrl(MEOWTH_DEX), m.meowth, 3000)
    case 'meowthHit':
      return playSfx('coin', 60)
    case 'payDay':
      playSfx('payDay')
      playCry(cryUrl(MEOWTH_DEX), 0.4)
      return iconToast(root, coinIcon(2), m.payDay(formatPokeDollars(notice.coins)), 3000)
    case 'meowthEscaped':
      playSfx('escaped')
      return iconToast(root, portraitUrl(MEOWTH_DEX), m.meowthEscaped, 2000)
  }
}
