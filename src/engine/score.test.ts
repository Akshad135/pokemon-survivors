import { describe, expect, it } from 'vitest'
import { THEMES } from '../data/music'
import { isDrum, noteToMidi, parseTrack, STEPS_PER_BAR, VOICES } from './score'

describe('parseTrack', () => {
  it('keeps lengths sticky within a bar and resets them to a quarter each bar', () => {
    const { notes, length } = parseTrack(['C4:2 E4 r:4 G4:8', 'A4'])
    expect(notes).toEqual([
      { at: 0, len: 2, sym: 'C4' },
      { at: 2, len: 2, sym: 'E4' },
      { at: 8, len: 8, sym: 'G4' },
      { at: 16, len: 4, sym: 'A4' },
    ])
    expect(length).toBe(20)
  })

  it('ties `-` onto the previous note, across bars too', () => {
    expect(parseTrack(['C4:12 -:4', '-:4']).notes).toEqual([{ at: 0, len: 20, sym: 'C4' }])
  })
})

describe('noteToMidi', () => {
  it('reads naturals, sharps and flats', () => {
    expect(noteToMidi('A4')).toBe(69)
    expect(noteToMidi('C4')).toBe(60)
    expect(noteToMidi('F#4')).toBe(66)
    expect(noteToMidi('Bb3')).toBe(58)
  })

  it('rejects anything else', () => {
    expect(noteToMidi('k')).toBeNull()
    expect(noteToMidi('H4')).toBeNull()
  })
})

describe('themes', () => {
  for (const [id, score] of Object.entries(THEMES)) {
    it(`${id}: every bar is full and every voice loops together`, () => {
      const bars = score.tracks.lead.length
      for (const voice of VOICES) {
        const track = score.tracks[voice]
        expect(track.length, voice).toBe(bars)
        track.forEach((bar, i) => expect(parseTrack([bar]).length, `${voice} bar ${i + 1}`).toBe(STEPS_PER_BAR))
      }
    })

    it(`${id}: every symbol is playable on its channel`, () => {
      for (const voice of VOICES) {
        for (const { sym } of parseTrack(score.tracks[voice]).notes) {
          expect(voice === 'drums' ? isDrum(sym) : noteToMidi(sym) !== null, `${voice}: ${sym}`).toBe(true)
        }
      }
    })
  }
})
