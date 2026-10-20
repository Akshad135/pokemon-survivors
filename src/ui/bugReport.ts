import { sendBugReport, techInfo } from '../bugReport'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { BUG_REPORT, cleanBugText, type BugCrash, type BugRun } from '../game/bugReport'
import { isDifficulty } from '../game/difficulty'
import { t } from '../i18n'
import { h, later } from './dom'
import type { Screen } from './screens'
import { toast } from './toasts'

/** `Charmeleon · 7:12 · Normal`, how the crash prompt names the run the game closed in. */
const runName = (run: BugRun | null) => {
  if (!run) return null
  const clock = `${Math.floor(run.time / 60)}:${String(run.time % 60).padStart(2, '0')}`
  return [run.form || run.partner, clock, isDifficulty(run.difficulty) ? t().difficulty.names[run.difficulty] : null].filter(Boolean).join(' · ')
}

/**
 * The bug report form: what happened (required), and a switch, on by
 * default, for the technical info (`techInfo`), which the player can unfold
 * to read before sending. With `crash` it's about the run the game closed in
 * last time: the text starts filled in and the info carries that run.
 * The info is gathered as the form opens, so what's shown is what's sent.
 * `back` runs once it closes, sent or not (after a toast when sent).
 */
export const bugReportForm = (root: HTMLElement, input: Input, back: () => void, crash: BugCrash | null = null): Screen => {
  const m = t().bugReport
  const tech = techInfo(crash)
  const text = h('textarea', { class: 'field-input field-area', maxlength: BUG_REPORT.text.max, rows: 5, placeholder: m.placeholder })
  if (crash) text.value = m.crashText
  const count = h('small', { class: 'field-count' })
  const counted = () => (count.textContent = `${text.value.length}/${BUG_REPORT.text.max}`)
  text.addEventListener('input', counted)
  counted()
  const include = h('input', { type: 'checkbox', checked: true })
  const details = h('details', { class: 'bug-details' }, h('summary', {}, m.techShow), h('pre', {}, JSON.stringify(tech, null, 1)))
  include.addEventListener('change', () => details.classList.toggle('hidden', !include.checked))
  const message = h('p', { class: 'field-message' }, m.note)
  const submit = h('button', { class: 'btn confirm', type: 'submit' }, m.send)
  const cancel = h('button', { class: 'btn', type: 'button' }, m.back)
  let busy = false
  let closed = false
  const say = (line: string) => {
    playSfx('denied')
    message.textContent = line
    message.classList.add('error')
  }
  const form = h(
    'form',
    {
      class: 'dialog box pop bug-form',
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault()
        if (busy) return
        const words = cleanBugText(text.value)
        if ([...words].length < BUG_REPORT.text.min) return say(m.errors.short(BUG_REPORT.text.min))
        busy = true
        submit.textContent = m.sending
        const sent = await sendBugReport({ text: words, tech: include.checked ? tech : null })
        busy = false
        submit.textContent = m.send
        if (closed) return
        if (sent !== 'sent') return say(m.errors[sent])
        playSfx('unlock')
        dispose()
        later(() => (toast(root, m.sent, 3200), back()))
      },
    },
    h('div', { class: 'dialog-title' }, crash ? m.crashTitle : m.title),
    h('p', { class: 'bug-lead' }, crash ? m.crashLead(runName(crash.run)) : m.lead),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, m.field), h('span', { class: 'field-box' }, text), count),
    h('label', { class: 'bug-include' }, include, h('span', {}, h('b', {}, m.tech), h('small', {}, m.techHint))),
    details,
    message,
    h('div', { class: 'buttons' }, submit, cancel),
  )
  const el = h('div', { class: 'screen dim bug-screen' }, form)
  function dispose() {
    closed = true
    offKeys()
    el.remove()
  }
  const close = () => {
    if (closed) return
    playSfx('select')
    dispose()
    later(back)
  }
  cancel.addEventListener('click', close)
  // Inside the fields the game's keys are off (see `createInput`), so Esc is caught here.
  form.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  const offKeys = input.onKey((key) => (key === 'Escape' || key === 'Backspace') && close())
  root.append(el)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) text.focus()
  return { el, dispose, dim: 0.5 }
}

/**
 * The card that asks, once, after the game closed mid-run last time: Report
 * opens the form about that run, Not now drops it. It sits in `host` (the
 * title) without blocking it, and goes away with it.
 */
export const crashPrompt = (host: HTMLElement, report: () => void) => {
  const m = t().bugReport.prompt
  const el = h(
    'div',
    { class: 'crash-prompt box pop', role: 'status' },
    h('p', {}, m.text),
    h(
      'div',
      { class: 'buttons' },
      h('button', { class: 'btn confirm', type: 'button', onclick: () => (playSfx('select'), el.remove(), later(report)) }, m.report),
      h('button', { class: 'btn', type: 'button', onclick: () => (playSfx('select'), el.remove()) }, m.dismiss),
    ),
  )
  host.append(el)
}
