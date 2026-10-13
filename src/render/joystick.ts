import { STICK_RADIUS, type Stick } from '../engine/input'
import { blitCentered, ellipse, ring } from '../engine/pixelart'

/**
 * Draws the floating touch joystick in screen space, on the same pixel grid as
 * the world. `cssScale` converts the stick's CSS px into canvas pixels.
 */
export const drawJoystick = (ctx: CanvasRenderingContext2D, stick: Stick, cssScale: number) => {
  const r = Math.max(10, Math.round(STICK_RADIUS / cssScale))
  const k = Math.max(4, Math.round(r * 0.42))
  const ox = stick.origin.x / cssScale
  const oy = stick.origin.y / cssScale
  const kx = stick.knob.x / cssScale
  const ky = stick.knob.y / cssScale

  // Base: translucent well with a light rim, a dark outer line for contrast on bright grass, and 4 notches.
  blitCentered(ctx, ellipse(r, r, 'rgba(16,24,48,0.3)'), ox, oy)
  blitCentered(ctx, ring(r + 1, 1, 'rgba(16,24,48,0.55)'), ox, oy)
  blitCentered(ctx, ring(r, 2, 'rgba(248,248,248,0.6)'), ox, oy)
  ctx.fillStyle = 'rgba(248,248,248,0.6)'
  const n = r - 5
  for (const [dx, dy] of [[0, -n], [n, 0], [0, n], [-n, 0]] as const) ctx.fillRect(Math.round(ox + dx) - 1, Math.round(oy + dy) - 1, 2, 2)

  // Knob: outlined ball with a top-left highlight, GBA button style.
  ctx.globalAlpha = 0.92
  blitCentered(ctx, ellipse(k, k, 'rgba(16,24,48,0.35)'), kx, ky + 2)
  blitCentered(ctx, ellipse(k + 1, k + 1, '#283040'), kx, ky)
  blitCentered(ctx, ellipse(k, k, '#a8a8c0'), kx, ky)
  blitCentered(ctx, ellipse(k - 2, k - 2, '#e8e8f0'), kx - 1, ky - 1)
  blitCentered(ctx, ellipse(1, 1, '#ffffff'), kx - Math.round(k * 0.45), ky - Math.round(k * 0.45))
  ctx.globalAlpha = 1
}
