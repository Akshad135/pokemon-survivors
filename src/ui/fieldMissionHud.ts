import { formatTime } from '../engine/math'
import { FIELD_TUNING } from '../game/fieldMissionRules'
import { liveMission } from '../game/fieldMissions'
import type { Game } from '../game/types'
import { t } from '../i18n'
import { h, setText } from './dom'

type Pill = { text: string; urgent: boolean } | null

/** What the field mission pill says: the goal and its clock (the defense's clock only runs inside the ring). */
const pillFor = (g: Game): Pill => {
  const ev = liveMission(g)
  if (!ev) return null
  const f = t().mapEvents.field
  const left = Math.max(0, ev.ttl - ev.age)
  const clock = formatTime(Math.ceil(left))
  switch (ev.kind) {
    case 'defense': {
      const s = ev.state
      if (!s.started) return { text: f.hudReach(clock), urgent: left < 10 }
      const hold = formatTime(Math.ceil((1 - s.progress) * FIELD_TUNING[g.difficulty].defense.hold))
      return { text: s.inside ? f.hudDefend(hold) : f.hudAway(hold), urgent: !s.inside }
    }
    case 'collect':
      return { text: f.hudCollect(ev.state.got, ev.state.balls.length, clock), urgent: left < 10 }
    case 'escort':
      return { text: ev.state.following ? f.hudEscort(clock) : f.hudFind(clock), urgent: left < 10 }
  }
}

/**
 * Small pill under the run timer with the live field mission's goal and
 * countdown. Sits below the rift pill when both show (`stacked`). Part of the HUD.
 */
export const createFieldMissionHud = () => {
  const el = h('div', { class: 'mission-pill box hidden' })
  let cls = ''
  const update = (g: Game, stacked: boolean) => {
    const pill = pillFor(g)
    const next = pill ? `mission-pill box${pill.urgent ? ' urgent' : ''}${stacked ? ' stacked' : ''}` : 'mission-pill box hidden'
    if (next !== cls) el.className = cls = next
    if (pill) setText(el, pill.text)
  }
  return { el, update }
}
