import { playCry, playSfx } from '../engine/audio'
import { isLegend, LEGEND_IDS, LEGENDS, type LegendId } from '../data/legends'
import { capturedCount, recordLegendWin, winsNeeded, type CaptureResult, type LegendWin } from '../game/capture'
import { cryUrl, portraitUrl } from '../render/sprites'
import { t } from '../i18n'
import { h, rich } from './dom'
import { loadSave, updateSave, writeSave } from './save'
import { toast } from './toasts'

/**
 * The shell's side of capturing legends (`game/capture.ts`): banks each
 * legendary boss's defeat into the save the moment it falls (so the capture
 * scene and a closed tab both see it) and says how it went: escaped with its
 * "2/3", captured, or its shiny unlocked.
 */

const legendName = (id: LegendId) => LEGENDS[id].line[0].name

/** The toast of a banked win. Silent for a legend already captured, unless its shiny just came with it. */
const captureToast = (root: HTMLElement, r: CaptureResult) => {
  const m = t().legend
  const name = legendName(r.legend)
  const dex = LEGENDS[r.legend].line[0].dex
  const say = (text: string, hint: string | null, shiny = false) =>
    toast(root, h('span', { class: 'item-toast' }, h('img', { src: portraitUrl(dex, shiny), alt: '' }), h('span', {}, rich(text), hint && h('small', {}, hint))), 4600, `capture-${r.legend}`)
  if (r.outcome === 'escaped') {
    playSfx('pokeballOpen')
    return say(m.escaped(name, r.wins, r.need), r.counted ? m.escapedHint(r.need - r.wins) : m.arceusHint(LEGEND_IDS.length - 1 - capturedCount(loadSave().legends)))
  }
  if (r.outcome === 'owned' && !r.shiny) return
  playSfx('unlock')
  playCry(cryUrl(dex), 0.6)
  if (r.outcome === 'owned') return say(m.shinyUnlocked(name), m.caughtHint, true)
  return say(r.shiny ? m.caughtShiny(name) : m.caught(name), m.caughtHint, r.shiny)
}

/** Banks a `legendBeaten` event (`endless`: the run was in endless mode then) and shows its toast. Species that aren't legends are skipped. */
export const bankCapture = (root: HTMLElement, legend: string, shiny: boolean, endless: boolean) => {
  if (!isLegend(legend)) return
  const { save, result } = recordLegendWin(loadSave(), { legend, shiny, endless } satisfies LegendWin)
  writeSave(save)
  captureToast(root, result)
}

/**
 * Dev console: `ps.capture('kyogre')` banks one win as if it fell, toast
 * included (`ps.capture('kyogre', 'shiny')` a shiny one), `ps.capture('kyogre', n)`
 * sets its count, `ps.captureAll()` captures all 23 (`true`: their shinies too).
 */
export const captureDevTools = (root: HTMLElement, endless: () => boolean) => ({
  capture: (id?: string, n?: number | 'shiny') => {
    if (!isLegend(id)) return `Legends: ${LEGEND_IDS.join(', ')}`
    if (typeof n !== 'number') return bankCapture(root, id, n === 'shiny', endless())
    updateSave((s) => ({ ...s, legends: { ...s.legends, [id]: Math.max(0, Math.floor(n)) } }))
    return `${id}: ${n}/${winsNeeded(id)}`
  },
  captureAll: (shiny = false) =>
    updateSave((s) => ({
      ...s,
      legends: Object.fromEntries(LEGEND_IDS.map((id) => [id, Math.max(s.legends[id] ?? 0, winsNeeded(id))])),
      shinyStarters: shiny ? { ...s.shinyStarters, ...Object.fromEntries(LEGEND_IDS.map((id) => [id, s.shinyStarters[id] ?? true])) } : s.shinyStarters,
    })),
})
