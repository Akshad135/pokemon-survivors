import type { Sheet } from './pokedex'

/** Side of the square stage a Pokédex sprite is drawn in, in CSS px. */
export const STAGE_SIZE = 144

/** Integer zoom (1x to 3x) that fits every sheet of a species in the stage, so pixels stay crisp. */
export const spriteScale = (sheets: readonly Sheet[]) =>
  Math.max(1, Math.min(3, ...sheets.map((s) => Math.floor(STAGE_SIZE / Math.max(s.frameWidth, s.frameHeight)))))

const round = (v: number) => Math.round(v * 1000) / 1000

/**
 * One keyframe per frame, at its share of the loop, holding `background-position-x`
 * on that column. Played with `steps(1)`, so PMD's per-frame durations (1/60s ticks) stay exact.
 */
const keyframes = (name: string, durations: readonly number[]) => {
  const total = durations.reduce((a, b) => a + b, 0)
  const last = durations.length - 1
  let at = 0
  const frames = durations.map((d, i) => {
    const frame = `${round((at / total) * 100)}%{background-position-x:${last > 0 ? round((i / last) * 100) : 0}%}`
    at += d
    return frame
  })
  return `@keyframes ${name}{${frames.join('')}}`
}

/**
 * Collects the CSS of every sprite sheet a page uses: one class per distinct
 * sheet (size, zoom, frame count, animation) and one `@keyframes` per distinct
 * timing. Sheets are 8 rows (one per direction); row 0 faces the camera.
 */
export const createSpriteCss = () => {
  const classes = new Map<string, { name: string; rule: string }>()
  const animations = new Map<string, { name: string; rule: string }>()

  const animationFor = (durations: readonly number[]) => {
    const key = durations.join(',')
    let anim = animations.get(key)
    if (!anim) {
      const name = `k${animations.size}`
      anim = { name, rule: keyframes(name, durations) }
      animations.set(key, anim)
    }
    return anim
  }

  /** Class name for a sheet drawn at `scale`. */
  const classFor = (sheet: Sheet, scale: number) => {
    const { frameWidth: w, frameHeight: h, durations } = sheet
    const key = `${w}x${h}@${scale}:${durations.join(',')}`
    let entry = classes.get(key)
    if (!entry) {
      const name = `s${classes.size}`
      const total = durations.reduce((a, b) => a + b, 0)
      const animation = durations.length > 1 ? `;animation:${animationFor(durations).name} ${round(total / 60)}s steps(1) infinite` : ''
      const rule = `.${name}{width:${w * scale}px;height:${h * scale}px;background-size:${durations.length * 100}% 800%${animation}}`
      entry = { name, rule }
      classes.set(key, entry)
    }
    return entry.name
  }

  const css = () => [...animations.values(), ...classes.values()].map((e) => e.rule).join('\n')

  return { classFor, css }
}
