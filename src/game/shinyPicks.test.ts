import { describe, expect, it } from 'vitest'
import { applyGift } from './gifts'
import { EMPTY_SAVE, parseSaveData, type Save } from './meta'
import { mergeShinyPicks, pendingPicks, pickShiny, pickShinyForm, playsShiny, shinyChoices } from './shinyPicks'
import { mergeSaves } from './sync'

/** A save holding one shiny ticket, from its Mystery Gift. */
const ticketed = (): Save => {
  const out = applyGift(EMPTY_SAVE, { id: 't1', content: { kind: 'shinyPick' }, reason: { kind: 'support', tier: 'supporter' } })
  if (out.status !== 'applied') throw new Error('expected the ticket to land')
  return out.save
}

describe('shiny picks', () => {
  it('leaves a ticket that a gift landing again does not double', () => {
    const save = ticketed()
    expect(pendingPicks(save)).toEqual([{ id: 't1', pick: null }])
    expect(applyGift(save, { id: 't1', content: { kind: 'shinyPick' }, reason: null }).status).toBe('claimed')
  })

  it('unlocks a starter shiny, picked to play', () => {
    const save = pickShiny(ticketed(), 't1', 'charmander')
    expect(save?.shinyStarters.charmander).toBe(true)
    expect(save && pendingPicks(save)).toEqual([])
    expect(save && pickShiny(save, 't1', 'squirtle')).toBeNull()
  })

  it('hatches an egg family shiny, unlocking it', () => {
    const save = pickShiny(ticketed(), 't1', 'gible')
    expect(save?.hatched.gible).toEqual({ shiny: true })
  })

  it('offers neither shinies already owned nor Munchlax', () => {
    const owned = { ...ticketed(), shinyStarters: { charmander: false }, hatched: { gible: { shiny: true } } }
    expect(shinyChoices(owned)).not.toContain('charmander')
    expect(shinyChoices(owned)).not.toContain('gible')
    expect(shinyChoices(owned)).not.toContain('munchlax')
    expect(pickShiny(owned, 't1', 'munchlax')).toBeNull()
  })

  it('keeps a pick made on either device', () => {
    const picked = pickShiny(ticketed(), 't1', 'charmander')!
    expect(mergeShinyPicks(ticketed().shinyPicks, picked.shinyPicks)).toEqual([{ id: 't1', pick: 'charmander' }])
    expect(mergeShinyPicks(picked.shinyPicks, ticketed().shinyPicks)).toEqual([{ id: 't1', pick: 'charmander' }])
    expect(mergeSaves(ticketed(), picked).shinyPicks).toEqual(picked.shinyPicks)
  })

  it('plays a shiny hatch Normal once picked so, keeping it owned', () => {
    const hatched: Save = { ...EMPTY_SAVE, hatched: { gible: { shiny: true } } }
    expect(playsShiny(hatched, 'gible')).toBe(true)
    const normal = pickShinyForm(hatched, 'gible', false)
    expect(playsShiny(normal, 'gible')).toBe(false)
    expect(normal.hatched.gible).toEqual({ shiny: true })
    expect(shinyChoices(normal)).not.toContain('gible')
    expect(playsShiny(pickShinyForm(normal, 'gible', true), 'gible')).toBe(true)
  })

  it('leaves a shiny not owned locked', () => {
    expect(pickShinyForm(EMPTY_SAVE, 'squirtle', true)).toBe(EMPTY_SAVE)
    expect(pickShinyForm({ ...EMPTY_SAVE, hatched: { gible: { shiny: false } } }, 'gible', true).shinyStarters).toEqual({})
  })

  it('survives the save parser, dropping unknown picks', () => {
    expect(parseSaveData({ ...ticketed(), shinyPicks: [{ id: 't1', pick: 'agumon' }, { id: '' }, 'x'] }).shinyPicks).toEqual([{ id: 't1', pick: null }])
  })
})
