import { DONATION } from '../../data/donations'
import type { Locale } from '../../i18n'
import { SITE_MESSAGES } from '../../i18n/site'
import { html } from '../html'
import { layout } from '../layout'
import { STRIPE_DONATION_URL } from '../routes'

/**
 * `/apoie/`: donations, two ways side by side. From Brazil, a preset or any
 * amount in reais opens an AbacatePay checkout (Pix or card) through the API;
 * from elsewhere, the Stripe Payment Link (card, Apple Pay, Google Pay in US$).
 * Portuguese lists Brazil first; `client.ts` reorders by the device's time zone
 * and wires the form, and both checkouts come back with `?thanks=1`.
 */
export const supportPage = (locale: Locale) => {
  const m = SITE_MESSAGES[locale]
  const s = m.support
  const br = html`<section class="box donate-way" id="donate-br" aria-labelledby="donate-br-title">
      <p class="donate-guess">${s.suggested}</p>
      <h2 id="donate-br-title">${s.br.title}</h2>
      <p>${s.br.methods}</p>
      <form id="donate-form" data-cta="${s.br.cta(DONATION.preset)}" data-loading="${s.br.loading}" data-error="${s.br.error}">
        <fieldset class="roles donate-amounts"><legend>${s.br.amount}</legend>
          ${DONATION.presets.map((v) => html`<label><input type="radio" name="preset" value="${v}"${v === DONATION.preset ? html` checked` : ''} /><span>R$ ${v}</span></label>`)}
        </fieldset>
        <label class="donate-other"><span>${s.br.other}</span><input type="number" name="other" min="${DONATION.min}" max="${DONATION.max}" step="1" inputmode="numeric" placeholder="R$" /></label>
        <p class="note">${s.br.range(DONATION.min, DONATION.max)}</p>
        <button class="btn-play" type="submit">${s.br.cta(DONATION.preset)}</button>
        <p class="donate-error" role="alert" hidden></p>
      </form>
      <p class="note">${s.br.via}</p>
    </section>`
  const intl = html`<section class="box donate-way" id="donate-intl" aria-labelledby="donate-intl-title">
      <p class="donate-guess">${s.suggested}</p>
      <h2 id="donate-intl-title">${s.intl.title}</h2>
      <p>${s.intl.methods}</p>
      <p><a class="btn-play" href="${STRIPE_DONATION_URL}">${s.intl.cta}</a></p>
      <p class="note">${s.intl.via}</p>
    </section>`
  const main = html`<div class="page-head"><h1>${s.h1}</h1><p class="lead">${s.lead}</p></div>
  <div class="doc-body narrow">
    <p class="box donate-thanks" id="donate-thanks" role="status" hidden>${s.thanks}</p>
    <div class="donate-ways" id="donate-ways" role="group" aria-label="${s.pick}">
      ${locale === 'pt' ? [br, intl] : [intl, br]}
    </div>
  </div>`
  return layout({ id: 'support', locale, title: s.title, description: s.description }, main)
}
