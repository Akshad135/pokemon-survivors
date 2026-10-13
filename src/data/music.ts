import type { Score } from '../engine/score'

/**
 * Original chiptune themes, written in the tracker notation of `engine/score.ts`
 * (lengths in sixteenths, sticky within a bar). Every track of a theme spans the
 * same number of bars, so the loop stays in sync (see `score.test.ts`).
 */

/* ---------------- Accompaniment figures ---------------- */

/** Alberti bass in eighths: low, high, middle, high. */
const alberti = (low: string, mid: string, high: string) => `${low}:2 ${high} ${mid} ${high} ${low} ${high} ${mid} ${high}`

/** Chord tones on the offbeats, oom-pah style. */
const offbeats = (a: string, b: string) => `r:2 ${a} r ${b} r ${a} r ${b}`

/** Root and octave bouncing in eighths, the classic driving chiptune bass. */
const pump = (low: string, high: string) => `${low}:2 ${high} ${low} ${high} ${low} ${high} ${low} ${high}`

/** 3+3+2 chord figure (tresillo), twice per bar. */
const tresillo = (a: string, b: string, c: string) => `${a}:3 ${b} ${c}:2 ${a}:3 ${b} ${c}:2`

/** Galloping sixteenth bass for the boss. */
const gallop = (low: string, high: string) => `${low}:2 ${low}:1 ${low} ${high}:2 ${low}:1 ${low} ${low}:2 ${high} ${low}:1 ${low} ${high}:2`

/** Two chord tones swapping every eighth. */
const tremolo = (a: string, b: string) => `${a}:2 ${b} ${a} ${b} ${a} ${b} ${a} ${b}`

const times = (n: number, bar: string) => Array.from({ length: n }, () => bar)

/* ---------------- Themes ---------------- */

/** Title and starter select: a calm village tune in F major. */
const menu: Score = {
  bpm: 96,
  duty: { lead: 0.25, harmony: 0.125 },
  tracks: {
    // | F | Dm | Bb | C | F | Am | Bb C | F |  then  | Bb | C | Am | Dm | Gm | C7 | F/A Bb | C |
    lead: [
      'C5:3 F5:1 A5:4 G5:2 F5 C5:4',
      'D5:3 F5:1 A5:4 C6 A5',
      'Bb5:6 A5:2 G5:4 F5',
      'G5:8 E5:4 C5',
      'C5:3 F5:1 A5:4 G5:2 F5 C6:4',
      'C6:4 A5:2 E5 A5:4 G5',
      'F5:4 D5:2 F5 E5:4 G5',
      'F5:12 r:4',
      'D6:4 C6:2 Bb5 A5:4 Bb5',
      'C6:6 Bb5:2 G5:8',
      'A5:4 G5:2 A5 C6:4 E5',
      'F5:6 E5:2 D5:8',
      'Bb5:4 A5:2 G5 D5:4 G5',
      'E5:4 F5:2 G5 C6:4 Bb5',
      'A5:4 G5:2 F5 D5:4 F5',
      'G5:6 A5:1 Bb5 C6:4 r',
    ],
    harmony: [
      alberti('F4', 'A4', 'C5'),
      alberti('D4', 'F4', 'A4'),
      alberti('Bb3', 'D4', 'F4'),
      alberti('C4', 'E4', 'G4'),
      alberti('F4', 'A4', 'C5'),
      alberti('A3', 'C4', 'E4'),
      'Bb3:2 F4 D4 F4 C4 G4 E4 G4',
      'F4:2 C5 A4 C5 F4:8',
      offbeats('D4', 'F4'),
      offbeats('E4', 'G4'),
      offbeats('C4', 'E4'),
      offbeats('F4', 'A4'),
      offbeats('Bb3', 'D4'),
      'r:2 E4 r Bb4 r E4 r G4',
      'r:2 C4 r F4 r D4 r F4',
      'r:2 E4 r G4 E4:4 r',
    ],
    bass: [
      'F2:4 A2 C3 A2',
      'D2:4 F2 A2 F2',
      'Bb2:4 F2 D2 F2',
      'C3:4 G2 E2 G2',
      'F2:4 A2 C3 A2',
      'A2:4 E2 C3 E2',
      'Bb2:4 F2 C3 G2',
      'F2:4 C3 F2:8',
      'Bb2:4 F2 D3 F2',
      'C3:4 G2 E3 G2',
      'A2:4 E2 C3 E2',
      'D3:4 A2 F2 A2',
      'G2:4 D3 Bb2 D3',
      'C3:4 G2 E2 G2',
      'A2:4 C3 Bb2 D3',
      'C3:4 G2 C3:2 D3 E3 G2',
    ],
    drums: [
      ...times(7, 'k:4 h:2 h s:4 h'),
      'k:4 h:2 h s s h s',
      ...times(7, 'k:4 h:2 h s:4 h'),
      'k:4 h:2 h s s h s',
    ],
  },
}

/** In a run: an adventurous dungeon march in A minor, with a harmonic-minor turnaround. */
const run: Score = {
  bpm: 138,
  duty: { lead: 0.5, harmony: 0.125 },
  tracks: {
    // | Am | F | G | Em | Am | F | G | G |  then  | F | G | Em | Am | F | G | E | E |
    lead: [
      'A4:2 C5 E5 A5:4 G5:2 E5:4',
      'F5:6 E5:2 C5:4 A4',
      'B4:2 D5 G5:4 F5:2 E5 D5:4',
      'E5:10 B4:2 C5 D5',
      'E5:2 A5 C6:4 B5:2 A5 E5:4',
      'F5:2 G5 A5:4 C6 A5',
      'B5:4 A5:2 G5 D5:4 G5',
      'G5:2 F5 E5 D5 B4:8',
      'A5:6 G5:2 F5:4 C5',
      'D5:6 E5:2 F5:4 G5',
      'G5:6 F5:2 E5:4 B4',
      'C5:2 D5 E5:4 A5:8',
      'C6:6 B5:2 A5:4 F5',
      'G5:6 A5:2 B5:4 D6',
      'E6:8 D6:2 B5 G#5:4',
      'E5:8 G#5:4 B5',
    ],
    harmony: [
      tresillo('C4', 'E4', 'A4'),
      tresillo('C4', 'F4', 'A4'),
      tresillo('B3', 'D4', 'G4'),
      tresillo('B3', 'E4', 'G4'),
      tresillo('C4', 'E4', 'A4'),
      tresillo('C4', 'F4', 'A4'),
      tresillo('B3', 'D4', 'G4'),
      'B3:3 D4 G4:2 D4:2 F4 G4:4',
      tresillo('C4', 'F4', 'A4'),
      tresillo('B3', 'D4', 'G4'),
      tresillo('B3', 'E4', 'G4'),
      tresillo('C4', 'E4', 'A4'),
      tresillo('C4', 'F4', 'A4'),
      tresillo('B3', 'D4', 'G4'),
      tresillo('B3', 'E4', 'G#4'),
      tresillo('B3', 'E4', 'G#4'),
    ],
    bass: [
      pump('A2', 'A3'),
      pump('F2', 'F3'),
      pump('G2', 'G3'),
      pump('E2', 'E3'),
      pump('A2', 'A3'),
      pump('F2', 'F3'),
      pump('G2', 'G3'),
      'G2:2 G3 G2 G3 G2 D3 B2 G2',
      pump('F2', 'F3'),
      pump('G2', 'G3'),
      pump('E2', 'E3'),
      pump('A2', 'A3'),
      pump('F2', 'F3'),
      pump('G2', 'G3'),
      pump('E2', 'E3'),
      'E2:2 E3 E2 E3 G#2 B2 D3 E3',
    ],
    drums: [
      ...times(7, 'k:2 h s h k k s h'),
      'k:2 h s h k:1 s s s s:2 s',
      ...times(7, 'k:2 h s h k k s h'),
      'k:2 h s h k:1 s s s s:2 o',
    ],
  },
}

/** While a boss is alive: a galloping E minor fight with phrygian and tritone bite. */
const boss: Score = {
  bpm: 160,
  duty: { lead: 0.25, harmony: 0.125 },
  tracks: {
    // | Em | Em | C | B | Em | Em | C | D B |  then  | Am | Em | F | B | Am | Em | C | B |
    lead: [
      'E5:8 F5:4 G5',
      'G5:4 F5 E5 B4',
      'C5:8 E5:4 G5',
      'F#5:8 D#5:4 B4',
      'E5:2 r E5 G5 B5:4 A5:2 G5',
      'A5:4 G5:2 F#5 G5:4 E5',
      'G5:2 A5 B5:4 C6 B5:2 G5',
      'A5:4 F#5 D#5 B4',
      'A5:2 C6 E6:4 D6:2 C6 B5:4',
      'G5:2 B5 E6:8 D6:4',
      'F5:2 A5 C6:4 B5:2 A5 F5:4',
      'F#5:12 D#5:4',
      'E6:4 D6:2 C6 B5:4 A5',
      'G5:4 F#5:2 E5 B4:8',
      'C5:2 E5 G5 C6 E6:8',
      'B5:2 A5 G5 F#5 D#5:4 B4',
    ],
    harmony: [
      'B4:16',
      'C5:16',
      'G4:16',
      'F#4:8 A4',
      'B4:16',
      'C5:16',
      'E5:16',
      'F#4:8 D#4',
      tremolo('A4', 'E4'),
      tremolo('G4', 'E4'),
      tremolo('A4', 'F4'),
      tremolo('F#4', 'D#4'),
      tremolo('A4', 'E4'),
      tremolo('G4', 'E4'),
      tremolo('G4', 'E4'),
      tremolo('F#4', 'D#4'),
    ],
    bass: [
      gallop('E2', 'E3'),
      gallop('E2', 'E3'),
      gallop('C2', 'C3'),
      gallop('B1', 'B2'),
      gallop('E2', 'E3'),
      gallop('E2', 'E3'),
      gallop('C2', 'C3'),
      'D2:2 D2:1 D2 D3:2 D2:1 D2 B1:2 B2 B1:1 B1 B2:2',
      gallop('A2', 'A3'),
      gallop('E2', 'E3'),
      gallop('F2', 'F3'),
      gallop('B1', 'B2'),
      gallop('A2', 'A3'),
      gallop('E2', 'E3'),
      gallop('C2', 'C3'),
      gallop('B1', 'B2'),
    ],
    drums: [
      ...times(7, 'k:2 h:1 h s:2 h:1 h k:2 k s h:1 h'),
      's:1 s s s k:2 s:1 s s:2 s:1 s s s k:2',
      ...times(3, 'k:2 h:1 h s:2 h:1 h k:2 k s h:1 h'),
      'k:2 o s k k k s o',
      ...times(3, 'k:2 h:1 h s:2 h:1 h k:2 k s h:1 h'),
      's:1 s s s k:2 s:1 s s:2 s:1 s s s k:2',
    ],
  },
}

export const THEMES = { menu, run, boss } as const satisfies Record<string, Score>

export type ThemeId = keyof typeof THEMES
