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
