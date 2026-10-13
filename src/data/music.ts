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

/** Root with a skip up the octave, then the fifth: a bouncy two-beat bass. */
const skip = (low: string, high: string, fifth: string) => `${low}:3 ${high}:1 ${fifth}:4 ${low}:3 ${high}:1 ${fifth}:4`

/** Eighth-note pedal on the root, leaning on the fifth and the octave. */
const ostinato = (root: string, fifth: string, octave: string) =>
  `${root}:2 ${root} ${fifth} ${root} ${octave} ${root} ${fifth} ${root}`

/** Three lonely drops spread over the bar, like water dripping in a cave. */
const drip = (a: string, b: string, c: string) => `r:2 ${a}:1 r:3 ${b}:1 r:3 ${c}:1 r:5`

/** Four chord tones cycling in sixteenths: a glittering, icy arpeggio. */
const sparkle = (a: string, b: string, c: string, d: string) => times(4, `${a}:1 ${b} ${c} ${d}`).join(' ')

/** Dotted quarter, eighth, two quarters: a slow, swaying bass. */
const sway = (low: string, high: string) => `${low}:6 ${high}:2 ${low}:4 ${high}`

/** Low, high, middle, high in eighths, the eerie music-box figure of the tower. */
const creep = (low: string, mid: string, high: string) => `${low}:2 ${mid} ${high} ${mid} ${low} ${mid} ${high} ${mid}`

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

/** Route 1, the first biome: an adventurous dungeon march in A minor, with a harmonic-minor turnaround. */
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

/** Viridian Forest: a playful, slightly mysterious walk in D dorian, with an A major turnaround. */
const forest: Score = {
  bpm: 126,
  duty: { lead: 0.25, harmony: 0.125 },
  tracks: {
    // | Dm | C | G | C | Dm | C | G | A |  then  | F | G | Em | Am | F | G | Em A | Dm |
    lead: [
      'D5:3 E5:1 F5:2 A5 G5:4 F5:2 E5',
      'E5:2 G5 C6:4 B5:2 G5 E5:4',
      'D5:3 B4:1 D5:2 G5 F5:4 E5:2 D5',
      'E5:8 G5:2 E5 C5:4',
      'D5:3 E5:1 F5:2 A5 D6:4 C6:2 A5',
      'G5:2 A5 G5 E5 C5:4 E5',
      'B4:2 D5 G5 B5 A5:4 G5:2 F5',
      'E5:8 C#5:4 A4',
      'A5:6 G5:2 F5:4 C5',
      'B5:6 A5:2 G5:4 D5',
      'G5:2 F5 E5 D5 E5:8',
      'C5:2 D5 E5 G5 A5:8',
      'C6:6 A5:2 F5:4 A5',
      'D6:6 B5:2 G5:4 B5',
      'B5:4 G5 A5:2 G5 E5 C#5',
      'D5:12 r:4',
    ],
    harmony: [
      alberti('D4', 'F4', 'A4'),
      alberti('C4', 'E4', 'G4'),
      alberti('B3', 'D4', 'G4'),
      alberti('C4', 'E4', 'G4'),
      alberti('D4', 'F4', 'A4'),
      alberti('C4', 'E4', 'G4'),
      alberti('B3', 'D4', 'G4'),
      alberti('C#4', 'E4', 'A4'),
      alberti('C4', 'F4', 'A4'),
      alberti('B3', 'D4', 'G4'),
      alberti('B3', 'E4', 'G4'),
      alberti('C4', 'E4', 'A4'),
      alberti('C4', 'F4', 'A4'),
      alberti('B3', 'D4', 'G4'),
      'B3:2 G4 E4 G4 C#4 A4 E4 A4',
      'D4:2 A4 F4 A4 D4:8',
    ],
    bass: [
      skip('D2', 'D3', 'A2'),
      skip('C2', 'C3', 'G2'),
      skip('G2', 'G3', 'D3'),
      skip('C2', 'C3', 'G2'),
      skip('D2', 'D3', 'A2'),
      skip('C2', 'C3', 'G2'),
      skip('G2', 'G3', 'D3'),
      skip('A2', 'A3', 'E3'),
      skip('F2', 'F3', 'C3'),
      skip('G2', 'G3', 'D3'),
      skip('E2', 'E3', 'B2'),
      skip('A2', 'A3', 'E3'),
      skip('F2', 'F3', 'C3'),
      skip('G2', 'G3', 'D3'),
      'E2:3 E3:1 B2:4 A2:3 A3:1 E3:4',
      'D2:3 D3:1 A2:4 D2:8',
    ],
    drums: [
      ...times(7, 'k:4 h:2 h s:4 h:2 h'),
      'k:4 h:2 h s:2 s:1 s s:2 s',
      ...times(7, 'k:4 h:2 h s:4 h:2 h'),
      'k:4 h:2 h s:2 s:1 s s:2 o',
    ],
  },
}

/** Mt. Moon: a slow, echoing C minor crawl over a pedal bass, with drips in the dark and a diminished sting. */
const cave: Score = {
  bpm: 104,
  duty: { lead: 0.125, harmony: 0.25 },
  tracks: {
    // | Cm | Ab | Bb | Cm | Cm | Ab | Fm | G |  then  | Ab | Bb | Gm | Cm | Ab | Bb | G7b9 | G |
    lead: [
      'G4:6 C5:2 Eb5:4 D5:2 C5',
      'Eb5:8 C5:4 Ab4',
      'F4:6 Bb4:2 D5:4 C5:2 Bb4',
      'C5:12 r:4',
      'G5:6 F5:2 Eb5:4 G5',
      'Ab5:6 G5:2 F5:4 Eb5',
      'F5:2 Eb5 D5 C5 Ab4:8',
      'B4:8 D5:4 G5',
      'C6:6 Bb5:2 Ab5:4 Eb5',
      'D6:6 C6:2 Bb5:4 F5',
      'G5:2 Bb5 D6 Bb5 G5:8',
      'Eb5:2 G5 C6:12',
      'Ab5:4 G5 F5 Eb5',
      'D5:4 Eb5 F5 Bb5',
      'B5:8 Ab5:4 F5',
      'D5:4 B4 G4:8',
    ],
    harmony: [
      drip('G5', 'C6', 'Eb6'),
      drip('Ab5', 'C6', 'Eb6'),
      drip('F5', 'Bb5', 'D6'),
      drip('G5', 'C6', 'Eb6'),
      drip('G5', 'C6', 'Eb6'),
      drip('Ab5', 'C6', 'Eb6'),
      drip('F5', 'Ab5', 'C6'),
      drip('G5', 'B5', 'D6'),
      offbeats('C4', 'Eb4'),
      offbeats('D4', 'F4'),
      offbeats('D4', 'G4'),
      offbeats('Eb4', 'G4'),
      offbeats('C4', 'Eb4'),
      offbeats('D4', 'F4'),
      offbeats('D4', 'F4'),
      'r:2 D4 r B3 D4:8',
    ],
    bass: [
      ostinato('C2', 'G2', 'C3'),
      ostinato('Ab1', 'Eb2', 'Ab2'),
      ostinato('Bb1', 'F2', 'Bb2'),
      ostinato('C2', 'G2', 'C3'),
      ostinato('C2', 'G2', 'C3'),
      ostinato('Ab1', 'Eb2', 'Ab2'),
      ostinato('F2', 'C3', 'F3'),
      ostinato('G1', 'D2', 'G2'),
      ostinato('Ab1', 'Eb2', 'Ab2'),
      ostinato('Bb1', 'F2', 'Bb2'),
      ostinato('G1', 'D2', 'G2'),
      ostinato('C2', 'G2', 'C3'),
      ostinato('Ab1', 'Eb2', 'Ab2'),
      ostinato('Bb1', 'F2', 'Bb2'),
      ostinato('G1', 'D2', 'G2'),
      'G1:2 G1 D2 G1 G2:8',
    ],
    drums: [
      ...times(7, 'k:6 k:2 s:8'),
      'k:4 s:2 s s:4 s:1 s s s',
      ...times(7, 'k:4 h:2 h s:4 h:2 h'),
      'k:4 s:2 s s:4 s:1 s s s',
    ],
  },
}

/** Mt. Silver: a cold, wide-open E minor climb with a flute-like lead over glittering ice arpeggios. */
const snow: Score = {
  bpm: 116,
  duty: { lead: 0.5, harmony: 0.125 },
  tracks: {
    // | Em | C | G | D | Em | C | Am | B |  then  | C | D | Bm | Em | C | D | B7b9 | B |
    lead: [
      'B4:6 E5:2 G5:4 F#5:2 E5',
      'G5:6 E5:2 C5:8',
      'D5:6 G5:2 B5:4 A5:2 G5',
      'F#5:12 r:4',
      'B5:6 A5:2 G5:4 E5',
      'E6:6 D6:2 C6:4 G5',
      'A5:2 B5 C6 B5 A5:4 E5',
      'D#5:8 F#5:4 B5',
      'C6:4 B5 G5 E5',
      'D6:4 C6 A5 F#5',
      'B5:6 A5:2 F#5:4 D5',
      'E5:2 F#5 G5 A5 B5:8',
      'C6:6 B5:2 A5:4 G5',
      'A5:6 G5:2 F#5:4 D5',
      'D#5:4 F#5 A5 C6',
      'B5:8 F#5:4 D#5',
    ],
    harmony: [
      sparkle('E4', 'G4', 'B4', 'E5'),
      sparkle('E4', 'G4', 'C5', 'E5'),
      sparkle('D4', 'G4', 'B4', 'D5'),
      sparkle('D4', 'F#4', 'A4', 'D5'),
      sparkle('E4', 'G4', 'B4', 'E5'),
      sparkle('E4', 'G4', 'C5', 'E5'),
      sparkle('E4', 'A4', 'C5', 'E5'),
      sparkle('D#4', 'F#4', 'B4', 'D#5'),
      sparkle('E4', 'G4', 'C5', 'E5'),
      sparkle('D4', 'F#4', 'A4', 'D5'),
      sparkle('D4', 'F#4', 'B4', 'D5'),
      sparkle('E4', 'G4', 'B4', 'E5'),
      sparkle('E4', 'G4', 'C5', 'E5'),
      sparkle('D4', 'F#4', 'A4', 'D5'),
      sparkle('D#4', 'F#4', 'A4', 'C5'),
      sparkle('D#4', 'F#4', 'B4', 'D#5'),
    ],
    bass: [
      sway('E2', 'E3'),
      sway('C2', 'C3'),
      sway('G2', 'G3'),
      sway('D2', 'D3'),
      sway('E2', 'E3'),
      sway('C2', 'C3'),
      sway('A2', 'A3'),
      sway('B1', 'B2'),
      sway('C2', 'C3'),
      sway('D2', 'D3'),
      sway('B1', 'B2'),
      sway('E2', 'E3'),
      sway('C2', 'C3'),
      sway('D2', 'D3'),
      sway('B1', 'B2'),
      'B1:6 B2:2 F#2:4 D#2',
    ],
    drums: [
      ...times(7, 'k:8 s:4 h'),
      'k:4 s:2 s s:4 s:1 s s s',
      ...times(7, 'k:4 h:2 k s:4 h'),
      'k:4 s:2 s s:4 s:1 s s o',
    ],
  },
}

/** Lavender Tower: a slow A minor music box over a heartbeat, with chromatic sighs and a Neapolitan shiver. */
const tower: Score = {
  bpm: 96,
  duty: { lead: 0.25, harmony: 0.125 },
  tracks: {
    // | Am | Am/G# | F | E | Am | Dm | Bdim | E |  then  | Dm | Am | F | E7 | Dm | Am | Bb | E |
    lead: [
      'E6:8 D6:4 C6',
      'B5:8 C6:4 B5',
      'A5:12 F5:4',
      'G#5:8 B5:4 D6',
      'C6:6 B5:2 A5:4 E5',
      'F5:6 G5:2 A5:4 D6',
      'F6:4 E6 D6 B5',
      'G#5:12 r:4',
      'D6:6 E6:2 F6:4 D6',
      'E6:6 D6:2 C6:4 A5',
      'C6:2 A5 F5 A5 C6:4 F6',
      'E6:8 D6:4 B5',
      'A5:6 Bb5:2 A5:4 F5',
      'E5:6 F5:2 E5:4 C5',
      'D5:4 F5 Bb5 D6',
      'B5:8 G#5:4 E5',
    ],
    harmony: [
      creep('A4', 'C5', 'E5'),
      creep('G#4', 'C5', 'E5'),
      creep('A4', 'C5', 'F5'),
      creep('G#4', 'B4', 'E5'),
      creep('A4', 'C5', 'E5'),
      creep('A4', 'D5', 'F5'),
      creep('B4', 'D5', 'F5'),
      creep('G#4', 'B4', 'E5'),
      creep('A4', 'D5', 'F5'),
      creep('A4', 'C5', 'E5'),
      creep('A4', 'C5', 'F5'),
      creep('G#4', 'B4', 'D5'),
      creep('A4', 'D5', 'F5'),
      creep('A4', 'C5', 'E5'),
      creep('Bb4', 'D5', 'F5'),
      creep('G#4', 'B4', 'E5'),
    ],
    bass: [
      'A2:8 E2',
      'G#2:8 E2',
      'F2:8 C3',
      'E2:8 B1',
      'A2:8 E2',
      'D2:8 A2',
      'B1:8 F2',
      'E2:8 B1',
      'D2:8 A2',
      'A2:8 E2',
      'F2:8 C3',
      'E2:8 G#2',
      'D2:8 A2',
      'A2:8 E2',
      'Bb1:8 F2',
      'E2:8 E2',
    ],
    drums: [
      ...times(7, 'k:2 k:14'),
      'k:2 k:6 h:2 h h h',
      ...times(7, 'k:2 k:6 h:8'),
      'k:2 k:6 h:2 h h o',
    ],
  },
}

export const THEMES = { menu, run, boss, forest, cave, snow, tower } as const satisfies Record<string, Score>

export type ThemeId = keyof typeof THEMES
