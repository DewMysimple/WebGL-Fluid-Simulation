import type { Color, Size } from './types'

export function resolution(
  base: number,
  width: number,
  height: number,
  maxSize = 4096,
): Size {
  const aspect = Math.max(1, width) / Math.max(1, height)
  const w = aspect > 1 ? base * aspect : base
  const h = aspect > 1 ? base : base / aspect
  const scale = Math.min(1, maxSize / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

export function randomColor(scale = 0.15): Color {
  const h = Math.random() * 6
  const x = 1 - Math.abs((h % 2) - 1)
  const colors = [
    [1, x, 0],
    [x, 1, 0],
    [0, 1, x],
    [0, x, 1],
    [x, 0, 1],
    [1, 0, x],
  ]
  const [r, g, b] = colors[Math.floor(h)]
  return { r: r * scale, g: g * scale, b: b * scale }
}

export function pointerPosition(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
) {
  return {
    x: Math.min(
      1,
      Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)),
    ),
    y:
      1 -
      Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height))),
  }
}
