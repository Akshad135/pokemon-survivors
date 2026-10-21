import { track } from '../analytics'
import { playSfx } from '../engine/audio'
import type { Input } from '../engine/input'
import { DIFFICULTY_IDS, type Difficulty } from '../game/difficulty'
import { SURVEY, SURVEY_ANSWERS, type SurveyAnswer } from '../data/survey'
import { t } from '../i18n'
import { h, later } from './dom'
import { loadSave } from './save'
import { difficultyTag, hint, type Screen } from './screens'
import { segmented } from './shell'
import { toast } from './toasts'

/** Where this device stands with the survey: `answered`, or closed unanswered (`dismissed`). */
const KEY = `ps:survey:${SURVEY.id}`

type Status = 'new' | 'dismissed' | 'answered'

const status = (): Status => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'answered' || v === 'dismissed' ? v : 'new'
  } catch {
    // Nowhere to remember a "not now": better never to ask than to ask every time.
    return 'answered'
  }
}

const remember = (s: Exclude<Status, 'new'>) => {
  try {
    localStorage.setItem(KEY, s)
  } catch {}
}

/** Forgets this device's answer (dev tools), so the lobby asks again. */
export const forgetSurvey = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

/** Whether the lobby shows the survey's button: a player with a few runs (`SURVEY.minRuns`) who hasn't answered. */
export const surveyWaiting = () => status() !== 'answered' && loadSave().achievements.lifetime.runs >= SURVEY.minRuns

let offered = false

/** Whether the lobby should open the survey by itself: at its first build of the page load, until it's closed once. */
export const takeSurveyOffer = () => {
  if (offered) return false
  offered = true
  return status() === 'new' && surveyWaiting()
}

/**
 * The difficulty survey, over the lobby: how Normal, Difícil and Pesadelo
 * feel (Fácil, Médio, Difícil or Não sei). ↑ ↓ move between the levels and the
 * buttons, ← → pick the answer. Enviar, once all three are in, sends them
 * (`survey_difficulty`) and thanks the player; Agora não, Esc or Backspace
 * close it unanswered, and the lobby's clipboard keeps asking. `onClose`
 * runs after the key dispatch.
 */
export const surveyScreen = (root: HTMLElement, input: Input, onClose: () => void): Screen => {
  const m = t().survey
  const answers: Partial<Record<Difficulty, SurveyAnswer>> = {}
  const complete = (a: Partial<Record<Difficulty, SurveyAnswer>>): a is Record<Difficulty, SurveyAnswer> => DIFFICULTY_IDS.every((d) => a[d])

  const rows = DIFFICULTY_IDS.map((d, i) => {
    const seg = segmented(
      SURVEY_ANSWERS.map((id) => ({ id, label: m.answers[id] })),
      null,
      (id) => (focus(i, false), answer(d, id)),
    )
    const el = h('div', { class: 'survey-row', role: 'group', 'aria-label': t().difficulty.names[d] }, difficultyTag(d), seg.el)
    return { d, el, seg }
  })
  const send = h('button', { class: 'btn confirm', type: 'button', onclick: () => submit() }, m.send)
  const skip = h('button', { class: 'btn', type: 'button', onclick: () => close() }, m.later)
  const buttons = [send, skip]

  /** The highlighted row: a level's, or `rows.length` for the buttons (`button` picks which). */
  let row = 0
  let button = 0
  const paint = () => {
    rows.forEach((r, i) => r.el.classList.toggle('selected', i === row))
    buttons.forEach((b, i) => b.classList.toggle('selected', row === rows.length && i === button))
    send.disabled = !complete(answers)
  }
  const focus = (i: number, sound = true) => {
    const next = Math.max(0, Math.min(rows.length, i))
    if (next !== row && sound) playSfx('move')
    row = next
    paint()
  }

  const answer = (d: Difficulty, id: SurveyAnswer) => {
    playSfx('move')
    answers[d] = id
    rows.find((r) => r.d === d)?.seg.set(id)
    paint()
  }

  /** ← → on a level: the next answer along, from the first (→) or the last (←) while it has none. */
  const step = (dir: -1 | 1) => {
    const r = rows[row]
    if (!r) {
      playSfx('move')
      button = (button + 1) % buttons.length
      return paint()
    }
    const at = answers[r.d]
    const i = at ? (SURVEY_ANSWERS.indexOf(at) + dir + SURVEY_ANSWERS.length) % SURVEY_ANSWERS.length : dir > 0 ? 0 : SURVEY_ANSWERS.length - 1
    answer(r.d, SURVEY_ANSWERS[i]!)
  }

  const submit = () => {
    if (!complete(answers)) return focus(DIFFICULTY_IDS.findIndex((d) => !answers[d]))
    const { runs, wins } = loadSave().achievements.lifetime
    track('survey_difficulty', { ...answers, runs, wins })
    remember('answered')
    toast(root, m.thanks)
    close()
  }

  const el = h(
    'div',
    { class: 'screen dim' },
    h(
      'div',
      { class: 'dialog box pop survey' },
      h('div', { class: 'dialog-title' }, m.title),
      h('p', { class: 'survey-question' }, m.question),
      h('div', { class: 'survey-rows' }, ...rows.map((r) => r.el)),
      h('div', { class: 'buttons' }, ...buttons),
      hint(m.hintKeys, m.hintTouch),
    ),
  )

  const offKeys = input.onKey((key) => {
    if (key === 'Escape' || key === 'Backspace') return close()
    if (key === 'ArrowUp' || key === 'KeyW') return focus(row - 1)
    if (key === 'ArrowDown' || key === 'KeyS') return focus(row + 1)
    if (key === 'ArrowLeft' || key === 'KeyA') return step(-1)
    if (key === 'ArrowRight' || key === 'KeyD') return step(1)
    if (key !== 'Enter' && key !== 'Space') return
    // Enter on a level moves on to the next one; on the buttons it presses the highlighted one.
    if (row < rows.length) return focus(row + 1)
    if (button === 0) submit()
    else close()
  })

  let closed = false
  const dispose = () => {
    closed = true
    offKeys()
    el.remove()
  }
  const close = () => {
    if (closed) return
    if (status() === 'new') remember('dismissed')
    playSfx('select')
    dispose()
    later(onClose)
  }

  paint()
  root.append(el)
  return { el, dispose, dim: 0.5 }
}
