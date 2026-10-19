import { accountHandle } from '../account'
import { findPlayers, sendGift, sentGifts } from '../admin'
import { HATCHLING_IDS, HATCHLINGS } from '../data/hatchlings'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import type { AdminSent, AdminUser } from '../game/admin'
import { EGG_TIER_IDS, type EggTier } from '../game/eggs'
import type { GiftContent } from '../game/gifts'
import { t } from '../i18n'
import { contentLine } from './gifts'
import { h, later, rich } from './dom'
import type { Screen } from './screens'

/*
 * The admin's gift desk. Only the admin ever sees it (the API answers 403 to
 * anyone else, whatever the page shows), so its own words are in Portuguese
 * only; what the player will read comes from `t()`, as on their side.
 */

/** Waits this long after the last key before searching. */
const SEARCH_MS = 350

/** A second tap on "Enviar" within this long sends; after it, the button asks again. */
const CONFIRM_MS = 4000

const KINDS = { egg: 'Ovo', coins: 'Pokédólares (₽)', shinyHatch: 'Shiny de uma família', shinyPick: 'Shiny à escolha (ticket)' } as const

type Kind = keyof typeof KINDS

const isKind = (v: string): v is Kind => v in KINDS

const option = (value: string, label: string) => h('option', { value }, label)

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const who = (u: { handle: string | null; name: string | null }) => (u.handle ? `@${u.handle}` : (u.name ?? 'sem @'))

/** One gift as a line with its icon, in the words the player gets. */
const giftLine = (content: GiftContent, ...after: (Node | string)[]) => {
  const line = contentLine({ content })
  return h('span', { class: 'gift-line' }, h('img', { src: line.src, alt: '' }), rich(line.text), ...after)
}

/**
 * The desk: search a player by handle or email, pick one, choose a gift
 * (an egg, ₽, a family's shiny or a shiny ticket), see it as the player will
 * and send it with a second tap. Below, the latest gifts sent by hand and
 * whether they were claimed. Back or Esc close it and call `onClose`.
 */
export const adminScreen = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  let target: AdminUser | null = null
  let request = crypto.randomUUID()
  let searchId = 0
  let timer = 0
  let armed = 0
  let busy = false
  let closed = false

  const query = h('input', { class: 'field-input', type: 'search', maxlength: 100, autocapitalize: 'none', autocorrect: 'off', autocomplete: 'off', spellcheck: 'false', placeholder: '@handle ou e-mail', enterkeyhint: 'search' })
  const results = h('div', { class: 'admin-results' })
  const status = h('p', { class: 'field-message' }, 'Busque pelo @ ou pelo e-mail.')

  const kind = h('select', { class: 'field-input admin-select' }, ...Object.entries(KINDS).map(([k, label]) => option(k, label)))
  const tier = h('select', { class: 'field-input admin-select' }, ...EGG_TIER_IDS.map((id) => option(id, t().eggs.tiers[id])))
  const amount = h('input', { class: 'field-input', type: 'number', inputmode: 'numeric', min: 1, max: 100000, step: 100, value: 1000 })
  const family = h('select', { class: 'field-input admin-select' }, ...HATCHLING_IDS.map((id) => option(id, HATCHLINGS[id].name)))
  const detail = h('span', { class: 'field-box' })
  const preview = h('div', { class: 'admin-preview box' })
  const message = h('p', { class: 'field-message' })
  const send = h('button', { class: 'btn confirm', type: 'button' }, 'Enviar presente')
  const giftPart = h(
    'div',
    { class: 'admin-gift hidden' },
    h('p', { class: 'admin-target' }),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'PRESENTE'), h('span', { class: 'field-box' }, kind)),
    h('label', { class: 'field' }, detail),
    h('span', { class: 'field-label' }, 'O QUE O JOGADOR VAI VER'),
    preview,
    message,
    send,
  )
  const recent = h('div', { class: 'admin-recent' })
  const back = h('button', { class: 'btn', type: 'button' }, 'Voltar')

  const say = (el: HTMLElement, text: string, error = false) => {
    el.textContent = text
    el.classList.toggle('error', error)
  }

  /** The gift the controls describe now, or null while ₽ isn't a valid amount. */
  const content = (): GiftContent | null => {
    const k = isKind(kind.value) ? kind.value : 'egg'
    switch (k) {
      case 'egg':
        return { kind: 'egg', tier: EGG_TIER_IDS.find((id): id is EggTier => id === tier.value) ?? 'common' }
      case 'coins': {
        const n = Math.floor(Number(amount.value))
        return n > 0 && n <= 100_000 ? { kind: 'coins', amount: n } : null
      }
      case 'shinyHatch':
        return { kind: 'shinyHatch', family: HATCHLING_IDS.find((id) => id === family.value) ?? HATCHLING_IDS[0]! }
      case 'shinyPick':
        return { kind: 'shinyPick' }
    }
  }

  /** Redraws the detail control and the preview; any change asks for a fresh confirmation. */
  const refresh = () => {
    armed = 0
    send.textContent = 'Enviar presente'
    const k = kind.value
    const control = k === 'egg' ? tier : k === 'coins' ? amount : k === 'shinyHatch' ? family : null
    detail.replaceChildren(...(control ? [control] : []))
    detail.parentElement?.classList.toggle('hidden', !control)
    const c = content()
    const from = h('small', {}, t().gifts.staff(accountHandle()))
    preview.replaceChildren(...(c ? [from, h('span', { class: 'admin-preview-title' }, t().gifts.title), giftLine(c)] : [h('small', {}, 'Valor inválido (1 a 100.000).')]))
    send.toggleAttribute('disabled', !c || !target)
  }

  const pick = (u: AdminUser, button: HTMLElement) => {
    playSfx('select')
    target = u
    request = crypto.randomUUID()
    results.querySelectorAll('.btn').forEach((b) => b.classList.toggle('selected', b === button))
    giftPart.querySelector('.admin-target')!.replaceChildren(rich(`Para *${who(u)}*${u.email ? ` · ${u.email}` : ''}`))
    giftPart.classList.remove('hidden')
    say(message, '')
    refresh()
  }

  const userButton = (u: AdminUser) => {
    const seen = u.seen ? `visto ${when(u.seen)}` : 'nunca sincronizou'
    const b = h(
      'button',
      { class: 'btn admin-user', type: 'button' },
      h('b', {}, who(u)),
      u.name && u.handle ? h('span', {}, u.name) : null,
      h('small', {}, [u.email, seen].filter(Boolean).join(' · ')),
    )
    b.addEventListener('click', () => pick(u, b))
    return b
  }

  const search = async () => {
    window.clearTimeout(timer)
    const q = query.value.trim()
    if (q.replace(/^@/, '').length < 2) return say(status, 'Busque pelo @ ou pelo e-mail.')
    const id = ++searchId
    say(status, 'Buscando…')
    const found = await findPlayers(q)
    if (id !== searchId || closed) return
    if (!found) return say(status, 'Não deu para buscar agora (sem conexão ou sem permissão).', true)
    say(status, found.length ? `${found.length} jogador(es). Toque em um para escolher.` : 'Ninguém com esse @ ou e-mail.', found.length === 0)
    results.replaceChildren(...found.map(userButton))
  }

  const recentLine = (g: AdminSent) =>
    h(
      'li',
      {},
      h('b', {}, who(g)),
      giftLine(g.content),
      h('small', { class: g.claimed ? 'claimed' : '' }, `${when(g.at)} · ${g.claimed ? `✓ resgatado ${when(g.claimed)}` : '⏳ aguardando a sincronização'}`),
    )

  const loadRecent = async () => {
    const list = await sentGifts()
    if (closed) return
    recent.replaceChildren(
      h('span', { class: 'field-label' }, 'ENVIADOS RECENTEMENTE'),
      !list ? h('p', { class: 'field-message error' }, 'Não deu para carregar.') : list.length === 0 ? h('p', { class: 'field-message' }, 'Nenhum ainda.') : h('ul', {}, ...list.map(recentLine)),
    )
  }

  send.addEventListener('click', async () => {
    const c = content()
    if (!c || !target || busy) return
    if (performance.now() - armed > CONFIRM_MS) {
      playSfx('move')
      armed = performance.now()
      send.textContent = `Confirmar: enviar para ${who(target)}?`
      return
    }
    busy = true
    send.textContent = 'Enviando…'
    const sent = await sendGift(target.id, c, request)
    busy = false
    if (closed) return
    refresh()
    if (sent === 'sent' || sent === 'again') {
      playSfx('unlock')
      request = crypto.randomUUID()
      say(message, sent === 'sent' ? `Enviado! Chega na próxima sincronização de ${who(target)}.` : 'Esse envio já tinha ido.')
      void loadRecent()
    } else {
      playSfx('hurt')
      say(message, sent === 'unknown' ? 'Esse jogador não existe mais.' : 'Não foi. Tente de novo (não duplica).', true)
    }
  })

  for (const el of [kind, tier, amount, family]) el.addEventListener('input', refresh)
  query.addEventListener('input', () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void search(), SEARCH_MS)
  })

  const form = h(
    'form',
    { class: 'dialog box pop admin', novalidate: true, onsubmit: (e: Event) => (e.preventDefault(), void search()) },
    h('div', { class: 'dialog-title' }, 'PRESENTES · ADMIN'),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'JOGADOR'), h('span', { class: 'field-box' }, query)),
    status,
    results,
    giftPart,
    recent,
    back,
  )
  const el = h('div', { class: 'screen dim' }, form)

  const dispose = () => {
    closed = true
    window.clearTimeout(timer)
    offKeys()
    el.remove()
  }
  const close = () => {
    if (closed) return
    playSfx('select')
    dispose()
    later(onClose)
  }
  back.addEventListener('click', close)
  // Inside the fields the game's keys are off (see `createInput`), so Esc is caught here.
  form.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  const offKeys = input.onKey((key) => key === 'Escape' && close())

  refresh()
  void loadRecent()
  root.append(el)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) query.focus()
  return { el, dispose, dim: 0.5 }
}
