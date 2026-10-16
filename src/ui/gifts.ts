import { HATCHLINGS } from '../data/hatchlings'
import type { GiftArrival } from '../account'
import type { Gift } from '../game/gifts'
import { formatDay, formatPokeDollars, t } from '../i18n'
import { coinIcon, eggIcon, giftIcon, medalIcon, ribbonIcon } from '../render/art'
import { frameIcon } from '../render/cosmetics'
import { portraitUrl } from '../render/sprites'
import { h, rich } from './dom'
import { banner, toast } from './toasts'

/** What a gift brought: an icon and a line of light markup. */
const contentLine = (gift: Gift): { src: string; text: string } => {
  const m = t().gifts
  const c = gift.content
  switch (c.kind) {
    case 'egg':
      return { src: eggIcon(c.tier), text: m.egg(t().eggs.tiers[c.tier]) }
    case 'coins':
      return { src: coinIcon(2), text: m.coins(formatPokeDollars(c.amount)) }
    case 'title':
      return { src: medalIcon('gold'), text: m.newTitle(t().achievements.titles[c.title]) }
    case 'style': {
      const names: Readonly<Record<string, string>> = t().mart.styles[c.style.slot]
      return { src: c.style.slot === 'frame' ? frameIcon(c.style.id) : giftIcon(), text: m.style(names[c.style.id] ?? c.style.id) }
    }
    case 'shinyHatch':
      return { src: portraitUrl(HATCHLINGS[c.family].line[0].dex, true), text: m.shinyHatch(HATCHLINGS[c.family].name) }
    case 'ribbon':
      return { src: ribbonIcon(c.ribbon.tier), text: m.ribbon(t().ribbons.names[c.ribbon.tier]) }
  }
}

/** Why it came: an invite, friends brought, or a day of the challenge (the place is in the ribbon). */
const reasonLine = (gift: Gift) => {
  const c = gift.content
  if (c.kind === 'ribbon') return t().gifts.ribbonWhy(formatDay(c.ribbon.day), c.ribbon.rank, c.ribbon.total)
  const r = gift.reason
  if (!r) return null
  return r.kind === 'welcome' ? t().gifts.welcome(r.from) : t().gifts.friends(r.count)
}

/**
 * "Presente Misterioso!": a banner per gift that landed (the box, why it
 * came and what it brought), and a toast when some wait for room in the
 * incubator. Banners take turns through the toast queue, over menus or a run.
 */
export const announceGifts = (root: HTMLElement, arrived: readonly GiftArrival[], waiting: number) => {
  for (const { gift } of arrived) {
    const line = contentLine(gift)
    const why = reasonLine(gift)
    banner(
      root,
      h(
        'span',
        { class: 'gift-banner' },
        h('img', { class: 'gift-box', src: giftIcon(), alt: '' }),
        h(
          'span',
          { class: 'gift-text' },
          why && h('small', {}, why),
          h('b', {}, t().gifts.title),
          h('span', { class: 'gift-line' }, h('img', { src: line.src, alt: '' }), rich(line.text)),
        ),
      ),
      4600,
    )
  }
  if (waiting > 0) toast(root, h('span', { class: 'item-toast' }, h('img', { src: giftIcon(), alt: '' }), t().gifts.wait), 4200, 'gift-wait')
}
