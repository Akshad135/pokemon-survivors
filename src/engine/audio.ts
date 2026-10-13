/**
 * Tiny chiptune SFX synth on WebAudio plus Pokémon cries.
 * Everything is lazy: the AudioContext is created on the first user gesture.
 */
type Wave = OscillatorType

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = localStorage.getItem('ps:muted') === '1'
const lastPlayed = new Map<string, number>()

const audio = () => {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.35
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, master: master! }
}

const tone = (freq: number, endFreq: number, duration: number, wave: Wave, volume = 0.3, delay = 0) => {
  const { ctx, master } = audio()
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + duration)
}

const noise = (duration: number, volume = 0.2, delay = 0) => {
  const { ctx, master } = audio()
  const t = ctx.currentTime + delay
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buffer
  gain.gain.value = volume
  src.connect(gain).connect(master)
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
  select: () => tone(660, 990, 0.08, 'square', 0.12),
  move: () => tone(440, 440, 0.04, 'square', 0.06),
  boss: () => [196, 185, 175, 165].forEach((f, i) => tone(f, f * 0.98, 0.35, 'sawtooth', 0.16, i * 0.3)),
  evolve: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.18, i * 0.11)),
  thunder: () => {
    noise(0.35, 0.18)
    tone(120, 40, 0.3, 'sawtooth', 0.12)
  },
  gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.3, 'triangle', 0.2, i * 0.25)),
} as const

export type Sfx = keyof typeof SFX

/** Plays a sound effect, throttled so dense hordes don't turn into noise. */
export const playSfx = (name: Sfx, minGapMs = 40) => {
  if (muted) return
  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? 0) < minGapMs) return
  lastPlayed.set(name, now)
  SFX[name]()
}

export const playCry = (url: string, volume = 0.35) => {
  if (muted) return
  const el = new Audio(url)
  el.volume = volume
  void el.play().catch(() => {})
}

export const toggleMute = () => {
  muted = !muted
  localStorage.setItem('ps:muted', muted ? '1' : '0')
  if (master) master.gain.value = muted ? 0 : 0.35
  return muted
}

export const isMuted = () => muted

/** Must be called from a user gesture to unlock audio on Safari/Chrome. */
export const unlockAudio = () => void audio()
