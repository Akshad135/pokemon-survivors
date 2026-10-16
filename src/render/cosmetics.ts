import { context2d, createCanvas, fromStrings } from '../engine/pixelart'

/**
 * Looks the player can show off: the frame and background of the share cards
 * (`render/card.ts`) and the Caixa do PC's wallpaper (`ui/pcBox.ts`). Each is
 * plain data keyed by id, so new ones (the Poké Mart's style shelf) are a new
 * entry here; everything that draws takes the equipped one, or the default.
 */

/** A card's border, outside in: `edge` line, `light` line, `main` band (2 px), `shade` line. `accent` dots the corners. */
export type CardFrame = { edge: string; light: string; main: string; shade: string; accent: string }

export const CARD_FRAMES = {
  /** The game's own dialog box: dark line, paper, blue. */
  classic: { edge: '#283040', light: '#f8f8f8', main: '#6878a8', shade: '#101830', accent: '#ffcb05' },
} as const satisfies Record<string, CardFrame>

export type CardFrameId = keyof typeof CARD_FRAMES

/** A card's backdrop: sky bands top to bottom (dithered where they meet) and how many stars. */
export type CardBackground = { sky: readonly string[]; stars: number; starColors: readonly string[] }

export const CARD_BACKGROUNDS = {
  night: { sky: ['#080c20', '#0e1430', '#141c40', '#1a2450', '#202c5c'], stars: 90, starColors: ['#ffffff', '#a8b8f8', '#f8e070', '#6878a8'] },
} as const satisfies Record<string, CardBackground>

export type CardBackgroundId = keyof typeof CARD_BACKGROUNDS

export type CardStyle = { frame: CardFrameId; background: CardBackgroundId }

export const DEFAULT_CARD_STYLE: CardStyle = { frame: 'classic', background: 'night' }

/** A Caixa do PC wallpaper: a 16×16 tile in pixel strings and its palette. */
export type Wallpaper = { tile: readonly string[]; palette: Readonly<Record<string, string>> }

export const PC_WALLPAPERS = {
  /** Blue diamonds, like the first box of the games' PC. */
  classic: {
    tile: [
      '1111111111111111',
      '1111111211111111',
      '1111112321111111',
      '1111123332111111',
      '1111233433211111',
      '1112334443321111',
      '1111233433211111',
      '1111123332111111',
      '1111112321111111',
      '1111111211111111',
      '1111111111111111',
      '1111111111111111',
      '2111111111111112',
      '3211111111111123',
      '3321111111111233',
      '3211111111111123',
    ],
    palette: { 1: '#5070b8', 2: '#5878c0', 3: '#6888d0', 4: '#80a0e0' },
  },
} as const satisfies Record<string, Wallpaper>

export type WallpaperId = keyof typeof PC_WALLPAPERS

export const DEFAULT_WALLPAPER: WallpaperId = 'classic'

const wallpaperUrls = new Map<WallpaperId, string>()

/** A wallpaper's tile as a data URL, for a CSS background (scaled in whole `--px` steps). */
export const wallpaperUrl = (id: WallpaperId = DEFAULT_WALLPAPER) => {
  let url = wallpaperUrls.get(id)
  if (!url) {
    const { tile, palette } = PC_WALLPAPERS[id]
    const sprite = fromStrings(tile, palette)
    const canvas = createCanvas(sprite.width, sprite.height)
    context2d(canvas).drawImage(sprite, 0, 0)
    wallpaperUrls.set(id, (url = canvas.toDataURL()))
  }
  return url
}
