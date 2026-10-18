/**
 * Tiny chiptune SFX synth on WebAudio plus Pokémon cries.
 * Everything is lazy: the AudioContext is created on the first user gesture.
 *
 * Mixing: sfx and cries → `sfx` bus, music (`music.ts`) → `music` bus, both
 * into `master`, which mute silences. Volumes come from the settings (`setMix`).
 */
type Wave = OscillatorType

const MASTER_VOLUME = 0.35
/** Music sits under effects and cries even with both sliders at 100%. */
const MUSIC_HEADROOM = 0.4

/** User-facing mix, 0..1 per slider. Applied to the buses whenever they exist. */
export type Mix = { musicVolume: number; sfxVolume: number; muted: boolean }

let mix: Mix = { musicVolume: 0.6, sfxVolume: 1, muted: false }
let graph: { ctx: AudioContext; master: GainNode; sfx: GainNode; music: GainNode } | null = null
const runningListeners = new Set<() => void>()
const lastPlayed = new Map<string, number>()

/** Sliders feel linear to the ear when the gain is squared. */
const loudness = (v: number) => v * v

const applyMix = () => {
  if (!graph) return
  const t = graph.ctx.currentTime
  graph.master.gain.setTargetAtTime(mix.muted ? 0 : MASTER_VOLUME, t, 0.02)
  graph.sfx.gain.setTargetAtTime(loudness(mix.sfxVolume), t, 0.02)
  graph.music.gain.setTargetAtTime(loudness(mix.musicVolume) * MUSIC_HEADROOM, t, 0.02)
}

const audio = () => {
  if (!graph) {
    const ctx = new AudioContext()
    const master = ctx.createGain()
    const sfx = ctx.createGain()
    const music = ctx.createGain()
    master.gain.value = 0
    sfx.connect(master)
    music.connect(master)
    master.connect(ctx.destination)
    graph = { ctx, master, sfx, music }
    ctx.addEventListener('statechange', () => ctx.state === 'running' && runningListeners.forEach((fn) => fn()))
    applyMix()
  }
  const { ctx, sfx } = graph
  // iOS reports 'interrupted' after calls or app switches; anything but running needs a resume.
  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  return { ctx, sfx }
}

/** Updates bus volumes and mute. Safe to call before audio is unlocked. */
export const setMix = (next: Mix) => {
  mix = next
  applyMix()
}

/**
 * The music bus, only once the context is actually running (after a user
 * gesture), so music never creates or wakes the AudioContext by itself.
 */
export const musicOutput = () => (graph?.ctx.state === 'running' ? { ctx: graph.ctx, bus: graph.music } : null)

/** Calls `fn` every time the context starts running (unlock, or back from an iOS interruption). */
export const onAudioRunning = (fn: () => void) => {
  runningListeners.add(fn)
  return () => void runningListeners.delete(fn)
}

const tone = (freq: number, endFreq: number, duration: number, wave: Wave, volume = 0.3, delay = 0) => {
  const { ctx, sfx } = audio()
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain).connect(sfx)
  osc.start(t)
  osc.stop(t + duration)
}

const noise = (duration: number, volume = 0.2, delay = 0) => {
  const { ctx, sfx } = audio()
  const t = ctx.currentTime + delay
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buffer
  gain.gain.value = volume
  src.connect(gain).connect(sfx)
  src.start(t)
}

const SFX = {
  hit: () => tone(320, 90, 0.07, 'square', 0.08),
  superHit: () => tone(520, 120, 0.1, 'square', 0.12),
  kill: () => noise(0.08, 0.06),
  pickup: () => tone(880, 1320, 0.06, 'triangle', 0.12),
  heal: () => [523, 659, 784].forEach((f, i) => tone(f, f, 0.12, 'triangle', 0.18, i * 0.08)),
  hurt: () => {
    tone(200, 60, 0.18, 'sawtooth', 0.2)
    noise(0.12, 0.15)
  },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.14, 'square', 0.14, i * 0.07)),
  coin: () => {
    tone(988, 988, 0.05, 'square', 0.1)
    tone(1319, 1319, 0.14, 'square', 0.1, 0.05)
  },
  buy: () => [1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.08, 'square', 0.1, i * 0.06)),
  denied: () => tone(160, 120, 0.16, 'square', 0.12),
  select: () => tone(660, 990, 0.08, 'square', 0.12),
  move: () => tone(440, 440, 0.04, 'square', 0.06),
  boss: () => [196, 185, 175, 165].forEach((f, i) => tone(f, f * 0.98, 0.35, 'sawtooth', 0.16, i * 0.3)),
  evolve: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.18, i * 0.11)),
  thunder: () => {
    noise(0.35, 0.18)
    tone(120, 40, 0.3, 'sawtooth', 0.12)
  },
  /** The classic shiny twinkle: two quick high arpeggios. */
  shiny: () => [1568, 2093, 2637, 2093, 2637, 3136].forEach((f, i) => tone(f, f, 0.09, 'square', 0.07, i * 0.06)),
  legendary: () => {
    noise(0.9, 0.12)
    tone(55, 40, 1.2, 'sawtooth', 0.2)
    ;[147, 175, 220, 294].forEach((f, i) => tone(f, f, 0.5, 'square', 0.1, 0.35 + i * 0.16))
  },
  quake: () => {
    noise(0.22, 0.14)
    tone(90, 40, 0.22, 'triangle', 0.18)
  },
  /** Fainting in a rift arena: a falling sigh, then the tear's rising whoosh pulling the player out. */
  riftFall: () => {
    ;[330, 262, 196].forEach((f, i) => tone(f, f * 0.94, 0.28, 'triangle', 0.18, i * 0.2))
    noise(0.9, 0.1, 1.2)
    tone(110, 880, 0.9, 'sawtooth', 0.07, 1.2)
  },
  item: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.1, 'square', 0.12, i * 0.06)),
  /** Poké Flute: a short lullaby. */
  flute: () => [523, 659, 784, 659, 523, 392].forEach((f, i) => tone(f, f * 1.01, 0.22, 'triangle', 0.2, i * 0.16)),
  explosion: () => {
    noise(0.7, 0.35)
    tone(180, 30, 0.6, 'sawtooth', 0.22)
  },
  break: () => {
    noise(0.06, 0.12)
    tone(700, 220, 0.07, 'square', 0.06)
  },
  specialCharge: () => {
    tone(160, 880, 0.32, 'square', 0.1)
    tone(240, 1320, 0.32, 'triangle', 0.08, 0.04)
  },
  specialBlast: () => {
    noise(0.5, 0.26)
    tone(150, 32, 0.55, 'sawtooth', 0.22)
    tone(90, 30, 0.7, 'square', 0.14, 0.05)
  },
  /** A chain dash landing: a short swish and a bright cut. */
  slash: () => {
    noise(0.09, 0.14)
    tone(1800, 420, 0.1, 'square', 0.08)
  },
  /** Aegislash's Stance Change: a metallic two-note shing. */
  stance: () => [880, 1320].forEach((f, i) => tone(f, f * 1.4, 0.07, 'square', 0.1, i * 0.05)),
  /** Mega Evolution: the keystone's shimmer climbing through the transformation, then the burst with a major chord. */
  megaCharge: () => {
    tone(220, 1760, 1.05, 'triangle', 0.1)
    ;[523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.1, 'square', 0.05, i * 0.14))
  },
  megaBurst: () => {
    noise(0.6, 0.22)
    tone(110, 36, 0.6, 'sawtooth', 0.2)
    ;[523, 659, 784, 1047].forEach((f) => tone(f, f, 0.6, 'triangle', 0.1, 0.05))
  },
  /* Map events */
  altar: () => {
    ;[523, 784, 1047, 1568].forEach((f, i) => tone(f, f * 1.01, 0.2, 'triangle', 0.16, i * 0.07))
    ;[2093, 2637].forEach((f, i) => tone(f, f, 0.12, 'square', 0.05, 0.3 + i * 0.06))
  },
  sip: () => {
    tone(520, 1100, 0.06, 'sine', 0.14)
    tone(760, 1400, 0.05, 'sine', 0.08, 0.05)
  },
  /** Lock click while a chest is being opened. */
  tick: () => tone(1400, 1100, 0.03, 'square', 0.07),
  unlock: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.12, 'square', 0.12, i * 0.07)),
  ambush: () => [220, 208, 220, 208].forEach((f, i) => tone(f, f * 0.97, 0.12, 'sawtooth', 0.12, i * 0.13)),
  /** Fuse hiss with beeps that speed up until the blast. */
  fuse: () => {
    noise(1.5, 0.05)
    ;[0, 0.4, 0.75, 1.05, 1.3, 1.5].forEach((d) => tone(1047, 1047, 0.05, 'square', 0.09, d))
  },
  spikes: () => {
    tone(1800, 500, 0.09, 'sawtooth', 0.06)
    noise(0.05, 0.08)
  },
  /** Pay Day: a cascade of coins. */
  payDay: () => [0, 1, 2, 3, 4, 5].forEach((i) => {
    tone(988 + i * 60, 988 + i * 60, 0.05, 'square', 0.08, i * 0.07)
    tone(1319 + i * 80, 1319 + i * 80, 0.1, 'square', 0.08, i * 0.07 + 0.04)
  }),
  escaped: () => [784, 659, 523].forEach((f, i) => tone(f, f * 0.9, 0.1, 'triangle', 0.12, i * 0.07)),
  gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.3, 'triangle', 0.2, i * 0.25)),
  /* Enemy traits */
  /** A kamikaze's lit fuse: beeps that speed up until the blast (about 1.1s). */
  selfDestruct: () => [0, 0.32, 0.58, 0.78, 0.92, 1.02].forEach((d, i) => tone(1100 + i * 90, 1100 + i * 90, 0.05, 'square', 0.07, d)),
  blast: () => {
    noise(0.4, 0.24)
    tone(160, 40, 0.35, 'sawtooth', 0.16)
  },
  beamCharge: () => tone(220, 880, 0.75, 'triangle', 0.09),
  beam: () => {
    noise(0.2, 0.08)
    tone(1200, 300, 0.28, 'sawtooth', 0.09)
  },
  leap: () => tone(180, 520, 0.3, 'triangle', 0.1),
  /** Soft chime for heal, ward and summon pulses. */
  enemyPulse: () => tone(660, 990, 0.16, 'triangle', 0.06),
  /* Signature moves (`ui/castSounds.ts`) */
  /** Hypnosis: a woozy wobble down and up. */
  hypnosis: () => [523, 392, 523, 392].forEach((f, i) => tone(f, f * 0.94, 0.12, 'triangle', 0.08, i * 0.09)),
  /** Digging in: a scrape of dirt and a low thud. */
  dig: () => {
    noise(0.18, 0.12)
    tone(140, 60, 0.2, 'triangle', 0.14)
  },
  /** A rush of wind spinning up (Twister). */
  whoosh: () => {
    noise(0.3, 0.07)
    tone(200, 620, 0.3, 'triangle', 0.05)
  },
  /** Sand hissing round. */
  sand: () => noise(0.45, 0.06),
  /** A fist pulling back, winding up. */
  windup: () => tone(180, 520, 0.18, 'square', 0.07),
  /** A boulder starting to roll: a low rumble. */
  roll: () => {
    tone(70, 110, 0.35, 'sawtooth', 0.09)
    noise(0.3, 0.05)
  },
  /** A blade drawn: a bright ring. */
  shing: () => [1568, 2349].forEach((f, i) => tone(f, f * 1.1, 0.12, 'square', 0.06, i * 0.04)),
  /** Two darts zipping off. */
  zip: () => [0, 0.07].forEach((d) => tone(900, 1800, 0.07, 'square', 0.05, d)),
  /** A three-headed growl. */
  growl: () => [110, 98, 123].forEach((f, i) => tone(f, f * 0.8, 0.14, 'sawtooth', 0.08, i * 0.11)),
  /** Giga Impact's charge: a rising roar. */
  charge: () => {
    tone(90, 300, 0.22, 'sawtooth', 0.14)
    noise(0.2, 0.1)
  },
  /** Metronome: tick, tock, and a chime for the pick. */
  metronome: () => {
    tone(1200, 1200, 0.03, 'square', 0.07)
    tone(900, 900, 0.03, 'square', 0.07, 0.14)
    tone(1047, 1568, 0.12, 'triangle', 0.1, 0.3)
  },
  /** A short chirp that echoes. */
  echo: () => [880, 880, 880].forEach((f, i) => tone(f, f * 1.2, 0.07, 'triangle', 0.09 - i * 0.025, i * 0.09)),
  /** A curse: an eerie fall. */
  curse: () => {
    tone(392, 196, 0.5, 'sawtooth', 0.06)
    tone(370, 185, 0.5, 'triangle', 0.08, 0.05)
  },
  /* Verb moves (`game/moveVerbs.ts`); a delayed hit is scheduled inside its sound. */
  /** Solar Beam: light gathering for a second, then the beam. */
  solarCharge: () => {
    tone(330, 1320, 0.95, 'triangle', 0.08)
    ;[784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.08, 'square', 0.035, 0.2 + i * 0.18))
    noise(0.45, 0.12, 1)
    tone(1400, 380, 0.5, 'sawtooth', 0.08, 1)
  },
  solarBeam: () => {
    noise(0.45, 0.12)
    tone(1400, 380, 0.5, 'sawtooth', 0.08)
  },
  focusReady: () => [1047, 1568].forEach((f, i) => tone(f, f, 0.09, 'square', 0.08, i * 0.07)),
  focusPunch: () => {
    noise(0.18, 0.22)
    tone(220, 50, 0.22, 'square', 0.18)
  },
  /** Future Sight: an eerie rising chime, then the columns crashing two seconds later. */
  futureSight: () => {
    ;[659, 831, 988, 1319].forEach((f, i) => tone(f, f * 1.02, 0.25, 'triangle', 0.06, i * 0.09))
    noise(0.3, 0.14, 2)
    tone(900, 120, 0.35, 'sawtooth', 0.08, 2)
  },
  bone: () => tone(520, 260, 0.14, 'triangle', 0.08),
  stealthRock: () => [0, 0.05, 0.1].forEach((d) => tone(240, 120, 0.06, 'square', 0.08, d)),
  uTurn: () => {
    tone(600, 1500, 0.12, 'square', 0.06)
    tone(1500, 600, 0.12, 'square', 0.06, 0.2)
  },
  dragonTail: () => {
    noise(0.16, 0.12)
    tone(160, 70, 0.18, 'sawtooth', 0.12)
  },
  sheerCold: () => {
    tone(2400, 1200, 0.3, 'triangle', 0.06)
    tone(3200, 1600, 0.25, 'sine', 0.05, 0.05)
  },
  roost: () => [988, 1319, 1568].forEach((f, i) => tone(f, f, 0.12, 'triangle', 0.08, i * 0.06)),
  /** Brine: the lob, then the splash as it lands. */
  brine: () => {
    tone(400, 700, 0.1, 'triangle', 0.05)
    noise(0.14, 0.1, 0.28)
  },
  electroBall: () => tone(900, 1800, 0.1, 'square', 0.05),
  suckerPunch: () => tone(300, 140, 0.06, 'square', 0.07),
  /* Starter signature moves (`ui/castSfx.ts`) */
  seedPop: () => [330, 494].forEach((f, i) => tone(f, f * 1.5, 0.06, 'triangle', 0.1, i * 0.07)),
  spin: () => {
    noise(0.3, 0.07)
    tone(220, 880, 0.3, 'triangle', 0.08)
  },
  petals: () => [1047, 1319, 1568, 1319].forEach((f, i) => tone(f, f, 0.08, 'triangle', 0.06, i * 0.05)),
  eruption: () => {
    noise(0.45, 0.16)
    tone(110, 35, 0.45, 'sawtooth', 0.14)
  },
  thrashGrowl: () => {
    tone(150, 90, 0.22, 'sawtooth', 0.1)
    tone(156, 95, 0.22, 'square', 0.05)
  },
  kick: () => [0, 0.15].forEach((d, i) => {
    noise(0.05, 0.1, d)
    tone(i ? 240 : 180, 60, 0.08, 'square', 0.1, d)
  }),
  splat: () => {
    noise(0.12, 0.12)
    tone(200, 70, 0.12, 'triangle', 0.12)
  },
  hammer: () => {
    noise(0.25, 0.22)
    tone(120, 30, 0.3, 'square', 0.18)
  },
  drill: () => tone(520, 980, 0.22, 'square', 0.05),
  whirl: () => {
    noise(0.5, 0.05)
    tone(300, 520, 0.5, 'triangle', 0.06)
  },
  flameRush: () => {
    noise(0.2, 0.1)
    tone(160, 640, 0.3, 'sawtooth', 0.08)
  },
  quills: () => [1600, 2000].forEach((f, i) => tone(f, f * 0.5, 0.06, 'sawtooth', 0.05, i * 0.04)),
  psybeam: () => [660, 880, 740, 990].forEach((f, i) => tone(f, f * 1.2, 0.07, 'triangle', 0.06, i * 0.05)),
  lariat: () => [0, 0.18, 0.36].forEach((d) => {
    noise(0.1, 0.06, d)
    tone(300, 160, 0.12, 'sawtooth', 0.05, d)
  }),
  aria: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.14, 'triangle', 0.07, i * 0.09)),
  snipe: () => {
    tone(1800, 240, 0.09, 'square', 0.1)
    noise(0.05, 0.1)
  },
  flower: () => [1319, 1760, 2093].forEach((f, i) => tone(f, f, 0.06, 'triangle', 0.07, i * 0.04)),
  splash: () => {
    noise(0.12, 0.08)
    tone(400, 900, 0.1, 'sine', 0.1)
  },
  crit: () => [1568, 2349].forEach((f, i) => tone(f, f, 0.06, 'square', 0.07, i * 0.04)),
  /* Egg signatures, third batch (`ui/castSounds.ts`) */
  /** Fiery Dance: a crackle and a twirl of rising notes. */
  flameDance: () => {
    noise(0.2, 0.06)
    ;[392, 523, 659].forEach((f, i) => tone(f, f * 1.2, 0.09, 'triangle', 0.07, i * 0.06))
  },
  /** Overdrive: a distorted power chord chugging. */
  riff: () => [0, 0.11, 0.22].forEach((d, i) => {
    tone(110 * (i === 2 ? 1.5 : 1), 108, 0.09, 'sawtooth', 0.09, d)
    tone(165 * (i === 2 ? 1.5 : 1), 160, 0.09, 'square', 0.05, d)
  }),
  /** Gigaton Hammer: a heavy clang with a metal ring. */
  gigaton: () => {
    tone(90, 40, 0.3, 'square', 0.16)
    tone(1320, 1250, 0.25, 'triangle', 0.06, 0.02)
    noise(0.15, 0.12)
  },
  /** Bitter Blade: a hiss of ghost fire cutting the air. */
  soulSlash: () => {
    noise(0.14, 0.08)
    tone(880, 330, 0.16, 'sawtooth', 0.05)
  },
  /** Heavy Slam: a dull steel thud. */
  thud: () => {
    tone(120, 45, 0.26, 'triangle', 0.18)
    tone(600, 560, 0.12, 'square', 0.04, 0.02)
  },
  /** Bulldoze: earth rumbling forward. */
  rumble: () => {
    tone(60, 90, 0.4, 'sawtooth', 0.08)
    noise(0.35, 0.07)
  },
  /** Perish Song: three eerie notes falling. */
  perish: () => [659, 587, 466].forEach((f, i) => tone(f, f * 0.98, 0.24, 'triangle', 0.09, i * 0.22)),
  /** Charge Beam: a quick electric buzz. */
  zap: () => {
    tone(220, 1760, 0.12, 'square', 0.06)
    noise(0.1, 0.05, 0.05)
  },
  /** Moonblast: a soft chime. */
  moonChime: () => [1047, 1319, 1568].forEach((f, i) => tone(f, f, 0.18, 'sine', 0.07, i * 0.05)),
  /** Frost Breath: a cold hiss with a shimmer. */
  frost: () => {
    noise(0.25, 0.06)
    tone(2093, 2637, 0.2, 'sine', 0.03)
  },
  /** Avalanche: snow thundering down. */
  avalanche: () => {
    noise(0.45, 0.1)
    tone(140, 50, 0.45, 'triangle', 0.1)
  },
  /* Legendary moves (`game/legendaryMoves.ts`); delayed impacts are scheduled inside their sound. */
  /** Whirlwind: a long rising howl of wind. */
  cyclone: () => {
    noise(0.9, 0.08)
    tone(140, 420, 0.8, 'sawtooth', 0.04)
    tone(420, 260, 0.6, 'triangle', 0.04, 0.3)
  },
  /** Sacred Fire: the phoenix's cry over crackling flame. */
  phoenix: () => {
    tone(880, 1760, 0.16, 'triangle', 0.08)
    tone(1760, 1320, 0.22, 'triangle', 0.07, 0.15)
    noise(0.4, 0.07, 0.05)
  },
  /** Origin Pulse: a deep boom swelling into a bright sweep. */
  originPulse: () => {
    tone(130, 40, 0.5, 'sine', 0.2)
    noise(0.35, 0.1)
    tone(400, 1400, 0.4, 'sine', 0.06, 0.18)
  },
  sands: () => {
    noise(0.5, 0.12)
    tone(220, 70, 0.45, 'sawtooth', 0.07)
  },
  /** Dragon Ascent: the climb, then the first dive crashing down. */
  ascent: () => {
    tone(300, 1800, 0.4, 'square', 0.05)
    noise(0.3, 0.2, 0.55)
    tone(160, 40, 0.35, 'square', 0.14, 0.55)
  },
  /** Roar of Time: the roar and the ticking clock, then time snapping back. */
  roarOfTime: () => {
    tone(200, 90, 0.6, 'sawtooth', 0.1)
    ;[0.15, 0.45, 0.75, 1.05, 1.35].forEach((d, i) => tone(i % 2 ? 1200 : 1600, i % 2 ? 1200 : 1600, 0.04, 'square', 0.05, d))
    tone(1800, 300, 0.25, 'square', 0.08, 1.7)
    noise(0.2, 0.1, 1.7)
  },
  mist: () => {
    tone(600, 900, 0.25, 'triangle', 0.06)
    tone(900, 640, 0.3, 'sine', 0.05, 0.12)
  },
  lusterPurge: () => {
    tone(1400, 700, 0.5, 'sawtooth', 0.06)
    tone(2400, 2200, 0.45, 'sine', 0.04)
  },
  /** Psycho Boost: the core charging, then the comets let loose. */
  psychoBoost: () => {
    tone(200, 1300, 0.45, 'square', 0.05)
    ;[0.5, 0.56, 0.62, 0.68].forEach((d) => tone(1500, 500, 0.08, 'square', 0.05, d))
  },
  wish: () => [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.06, i * 0.07)),
  /** Ancient Power raised every stat. */
  ancientBoost: () => {
    noise(0.25, 0.08)
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.12, 'square', 0.06, 0.1 + i * 0.06))
  },
  leaves: () => [1568, 1976, 2349, 1976, 2637].forEach((f, i) => tone(f, f * 1.05, 0.05, 'triangle', 0.05, i * 0.04)),
} as const

export type Sfx = keyof typeof SFX

/** Plays a sound effect, throttled so dense hordes don't turn into noise. */
export const playSfx = (name: Sfx, minGapMs = 40) => {
  if (mix.muted) return
  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? 0) < minGapMs) return
  lastPlayed.set(name, now)
  SFX[name]()
}

const cries = new Map<string, Promise<AudioBuffer | null>>()

/** Decodes a cry once. `null` means this browser can't decode it in WebAudio (old Safari + .ogg). */
const loadCry = (url: string) => {
  let buffer = cries.get(url)
  if (!buffer) {
    buffer = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => audio().ctx.decodeAudioData(data))
      .catch(() => null)
    cries.set(url, buffer)
  }
  return buffer
}

/**
 * Plays a cry through the (already unlocked) AudioContext, so iOS doesn't
 * block it outside a gesture. Falls back to an <audio> element.
 */
export const playCry = (url: string, volume = 0.35) => {
  if (mix.muted) return
  void loadCry(url).then((buffer) => {
    if (!buffer) {
      const el = new Audio(url)
      el.volume = volume * loudness(mix.sfxVolume)
      return void el.play().catch(() => {})
    }
    const { ctx, sfx } = audio()
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    src.buffer = buffer
    gain.gain.value = volume / MASTER_VOLUME
    src.connect(gain).connect(sfx)
    src.start()
  })
}

/**
 * Must be called from a user gesture to unlock audio. On touch, only
 * pointerup/touchend count as activation (not pointerdown), so the shell
 * listens to those. Until the context runs, each call also plays a silent
 * buffer, which older iOS needs before WebAudio makes any sound.
 */
export const unlockAudio = () => {
  const { ctx } = audio()
  if (ctx.state === 'running') return
  const src = ctx.createBufferSource()
  src.buffer = ctx.createBuffer(1, 1, 22050)
  src.connect(ctx.destination)
  src.start(0)
}
