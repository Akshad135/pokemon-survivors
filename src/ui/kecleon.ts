import { t } from '../i18n'
import { context2d, createCanvas } from '../engine/pixelart'
import { KECLEON_DEX, KECLEON_NAME, purpleize } from '../render/plaza'
import { emotionUrl, type DialogueLine, type Emotion, type Speaker } from './dialogue'
import { h } from './dom'

/** Portrait sizes: SpriteCollab's are 40×40. */
const PORTRAIT = 40

/** The purple brother's portrait: the green one's, recolored like his sprites once it loads. */
const purplePortrait = (emotion: Emotion) => {
  const canvas = createCanvas(PORTRAIT, PORTRAIT)
  const img = new Image()
  img.onload = () => context2d(canvas).drawImage(purpleize(img), 0, 0)
  img.src = emotionUrl(KECLEON_DEX, emotion)
  return canvas
}

/** The shop's two Kecleon as dialogue speakers: the green one runs the shop, the purple brother arrives with the Tent (Lv 2). */
export const kecleonSpeaker = (purple = false): Speaker => ({
  name: KECLEON_NAME,
  color: purple ? '#7048a8' : '#3e8a3a',
  portrait: (emotion) => (purple ? purplePortrait(emotion) : h('img', { src: emotionUrl(KECLEON_DEX, emotion), alt: '', width: PORTRAIT, height: PORTRAIT })),
})

/** The time of day a greeting follows, from the local hour. */
export const partOfDay = (hour: number) => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 ? 'evening' : 'night')

const GREETING_EMOTION = { morning: 'Happy', afternoon: 'Joyous', evening: 'Normal', night: 'Surprised' } as const satisfies Record<ReturnType<typeof partOfDay>, Emotion>

/** Kecleon's hello when the partner reaches the counter (PR 3 brings the lines that follow who you are and what you did). */
export const greeting = (now = new Date()): DialogueLine => {
  const part = partOfDay(now.getHours())
  return { text: t().plaza.greetings[part], emotion: GREETING_EMOTION[part] }
}
