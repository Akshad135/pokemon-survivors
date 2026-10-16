import { describe, expect, it } from 'vitest'
import manifest from '../data/sprites.generated.json'
import { ENEMIES, type EnemyId } from '../data/enemies'
import { RUN_LENGTH } from '../data/waves'
import { appearances, clock, pokedex, regionOf } from './pokedex'

describe('pokedex', () => {
  const entries = pokedex()

  it('lists every species the game loads exactly once, with unique anchors', () => {
    expect(entries.map((e) => e.dex).sort((a, b) => a - b)).toEqual(Object.keys(manifest).map(Number).sort((a, b) => a - b))
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length)
  })

  it('gives legendaries, bosses and regular enemies their role', () => {
    const role = (name: string) => entries.find((e) => e.name === name)?.role
    expect([role('Charizard'), role('Rattata'), role('Onix'), role('Mewtwo')]).toEqual(['starter', 'enemy', 'boss', 'legendary'])
  })
})

describe('regionOf', () => {
  it('maps national dex numbers to the generation they debuted in', () => {
    expect([1, 151, 152, 386, 387, 809, 810, 906].map((dex) => regionOf(dex).name)).toEqual([
      'Kanto', 'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Alola', 'Galar', 'Paldea',
    ])
  })
})

describe('appearances', () => {
  const ids = Object.keys(ENEMIES) as EnemyId[]

  it('merges spawn-pool windows into ordered, non-overlapping spans inside the run', () => {
    for (const id of ids) {
      const windows = appearances(id).flatMap((a) => (a.kind === 'horde' ? [a] : []))
      windows.forEach((w, i) => {
        expect(w.from).toBeLessThan(w.until)
        expect(w.until).toBeLessThanOrEqual(RUN_LENGTH)
        if (i > 0) expect(w.from).toBeGreaterThan(windows[i - 1]!.until)
      })
    }
  })

  it('places every Pokémon somewhere in the run, bosses as boss events, trio slots, rifts or the reaper', () => {
    for (const id of ids) {
      const kinds = appearances(id).map((a) => a.kind)
      expect(kinds.length).toBeGreaterThan(0)
      if ('boss' in ENEMIES[id]) expect(kinds.some((k) => k === 'boss' || k === 'trio' || k === 'rift' || k === 'reaper')).toBe(true)
    }
  })
})

describe('clock', () => {
  it('formats run time like the HUD', () => {
    expect([0, 75, 150, 900].map(clock)).toEqual(['0:00', '1:15', '2:30', '15:00'])
  })
})
