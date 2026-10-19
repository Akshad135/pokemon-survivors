import { HATCHLINGS } from '../data/hatchlings'
import type { GiftArrival } from '../account'
import type { Gift } from '../game/gifts'
import { formatDay, formatPokeDollars, t } from '../i18n'
import { coinIcon, eggIcon, giftIcon, medalIcon, ribbonIcon, sparkleIcon } from '../render/art'
import { frameIcon } from '../render/cosmetics'
import { portraitUrl } from '../render/sprites'
import { h, rich } from './dom'
import { banner, toast } from './toasts'

/** What a gift brought: an icon and a line of light markup. The admin's desk previews gifts with it too. */
export const contentLine = (gift: Pick<Gift, 'content'>): { src: string; text: string } => {
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
    case 'shinyPick':
      return { src: sparkleIcon(), text: m.shinyPick }
  }
}

/** Why it came: an invite, friends brought, a donation, the admin's present, or a day of the challenge (the place is in the ribbon). */
const reasonLine = (gift: Gift) => {
  const c = gift.content
  if (c.kind === 'ribbon') return t().gifts.ribbonWhy(formatDay(c.ribbon.day), c.ribbon.rank, c.ribbon.total)
  const r = gift.reason
  if (!r) return null
  switch (r.kind) {
    case 'welcome':
      return t().gifts.welcome(r.from)
    case 'friends':
      return t().gifts.friends(r.count)
    case 'support':
      return t().gifts.support(r.tier)
    case 'staff':
      return t().gifts.staff(r.from)
  }
}

/** How long a gift banner stays up: a little longer for each line it lists. */
const bannerMs = (lines: number) => 4600 + (lines - 1) * 1200

/**
 * "Presente Misterioso!": one banner for the gifts that landed together (the
 * box, then what they brought, grouped under why they came: a supporter tier
 * brings three at once), and a toast when some wait for room in the
 * incubator. Banners take turns through the toast queue, over the title or a run,
 * and a tap puts one away.
 */
export const announceGifts = (root: HTMLElement, arrived: readonly GiftArrival[], waiting: number) => {
  if (arrived.length > 0) {
    const groups = new Map<string, { why: string | null; lines: HTMLElement[] }>()
    for (const { gift } of arrived) {
      const why = reasonLine(gift)
      const line = contentLine(gift)
      const group = groups.get(why ?? '') ?? { why, lines: [] }
      group.lines.push(h('span', { class: 'gift-line' }, h('img', { src: line.src, alt: '' }), rich(line.text)))
      groups.set(why ?? '', group)
    }
    const title = h('b', {}, t().gifts.title)
    const [only] = groups.size === 1 ? [...groups.values()] : []
    // One reason sits above the title, as for a single gift; several each head their own lines.
    const body = only
      ? [only.why && h('small', {}, only.why), title, ...only.lines]
      : [title, ...[...groups.values()].map((g) => h('span', { class: 'gift-group' }, g.why && h('small', {}, g.why), ...g.lines))]
    banner(root, h('span', { class: 'gift-banner' }, h('img', { class: 'gift-box', src: giftIcon(), alt: '' }), h('span', { class: 'gift-text' }, ...body)), bannerMs(arrived.length), true)
  }
  if (waiting > 0) toast(root, h('span', { class: 'item-toast' }, h('img', { src: giftIcon(), alt: '' }), t().gifts.wait), 4200, 'gift-wait')
}
