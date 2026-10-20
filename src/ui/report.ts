import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { formatTime } from '../engine/math'
import type { Difficulty } from '../game/difficulty'
import { parseReport, REPORT, REPORT_REASONS, type ReportReason } from '../game/reports'
import { t } from '../i18n'
import { sendReport } from '../reports'
import { h, later } from './dom'
import type { Screen } from './screens'

/** Who is reported: a player, and the run on the boards when it's about one. */
export type ReportSubject = { handle: string; name: string; run: { id: string; pokemon: string; time: number; difficulty: Difficulty } | null }

/**
 * The report dialog, for signed-in players (the boards' flag, the profile's
 * Denunciar): a reason, an optional note, then a thank-you. What the API
 * did with it is never shown (it doesn't say). `back` runs once it closes,
 * sent or not.
 */
export const reportDialog = (root: HTMLElement, input: Input, subject: ReportSubject, back: () => void): Screen => {
  const m = t().report
  const radio = (reason: ReportReason) => h('input', { type: 'radio', name: 'report-reason', value: reason, checked: reason === 'cheating' })
  const radios = REPORT_REASONS.map(radio)
  const note = h('textarea', { class: 'field-input field-area', maxlength: REPORT.note.max, rows: 3, placeholder: m.placeholder })
  const count = h('small', { class: 'field-count' })
  const counted = () => (count.textContent = `${[...note.value].length}/${REPORT.note.max}`)
  note.addEventListener('input', counted)
  counted()
  const message = h('p', { class: 'field-message' }, m.privacy)
  const submit = h('button', { class: 'btn confirm', type: 'submit' }, m.send)
  const cancel = h('button', { class: 'btn', type: 'button', onclick: () => close() }, m.back)
  let busy = false
  let closed = false

  const say = (line: string) => {
    playSfx('denied')
    message.textContent = line
    message.classList.add('error')
  }

  /** Swaps the form for the thank-you, with one button to leave. */
  const thank = () => {
    const ok = h('button', { class: 'btn confirm', type: 'button', onclick: () => close() }, m.ok)
    form.replaceChildren(h('div', { class: 'dialog-title' }, m.thanksTitle), h('p', { class: 'report-lead' }, m.thanks), h('div', { class: 'buttons' }, ok))
    ok.focus()
  }

  const onSubmit = async (e: Event) => {
    e.preventDefault()
    if (busy) return
    const reason = radios.find((r) => r.checked)?.value
    const draft = parseReport({ target: subject.handle, run: subject.run?.id ?? null, reason, note: note.value })
    if (!draft) return say(m.errors.invalid)
    busy = true
    submit.textContent = m.sending
    const sent = await sendReport(draft)
    busy = false
    submit.textContent = m.send
    if (closed) return
    if (sent === 'sent') return (playSfx('unlock'), thank())
    say(sent === 'limit' ? m.errors.limit(REPORT.perDay) : m.errors[sent])
  }

  const run = subject.run
  const form = h(
    'form',
    { class: 'dialog box pop report-form', novalidate: true, onsubmit: (e: Event) => void onSubmit(e) },
    h('div', { class: 'dialog-title' }, m.title),
    h(
      'div',
      { class: 'report-lead' },
      h('b', {}, m.lead(subject.name, subject.handle)),
      run && h('small', {}, m.run(run.pokemon, formatTime(run.time), t().difficulty.names[run.difficulty])),
    ),
    h(
      'fieldset',
      { class: 'report-reasons' },
      h('legend', { class: 'field-label' }, m.reason),
      ...radios.map((r, i) => {
        const reason = m.reasons[REPORT_REASONS[i]!]
        return h('label', { class: 'report-reason' }, r, h('span', {}, h('b', {}, reason.name), h('small', {}, reason.hint)))
      }),
    ),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, m.note), h('span', { class: 'field-box' }, note), count),
    message,
    h('div', { class: 'buttons' }, submit, cancel),
  )
  const el = h('div', { class: 'screen dim report-screen' }, form)

  const dispose = () => {
    closed = true
    offKeys()
    el.remove()
  }
  function close() {
    if (closed) return
    playSfx('select')
    dispose()
    later(back)
  }
  // Inside the fields the game's keys are off (see `createInput`), so Esc is caught here.
  form.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  const offKeys = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && close())
  root.append(el)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) radios[0]!.focus()
  return { el, dispose, dim: 0.5 }
}
