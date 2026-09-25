import { hexToColor, type FluidConfig } from './config'
import { pointerPosition, randomColor } from './math'
import type { Color, Splat } from './types'

interface Pointer {
  x: number
  y: number
  color: Color
  colorTime: number
}

export function bindPointerInput(
  canvas: HTMLCanvasElement,
  config: () => FluidConfig,
  emit: (id: number, splat: Splat) => void,
): () => void {
  const events = new AbortController()
  const pointers = new Map<number, Pointer>()
  const color = () =>
    config().colorful ? randomColor() : hexToColor(config().inkColor, 0.15)
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      event.preventDefault()
      canvas.setPointerCapture(event.pointerId)
      const position = pointerPosition(
        event.clientX,
        event.clientY,
        canvas.getBoundingClientRect(),
      )
      const ink = color()
      pointers.set(event.pointerId, {
        ...position,
        color: ink,
        colorTime: performance.now(),
      })
      emit(event.pointerId, { ...position, dx: 0, dy: 0, color: ink })
    },
    { signal: events.signal },
  )
  canvas.addEventListener(
    'pointermove',
    (event) => {
      const pointer = pointers.get(event.pointerId)
      if (!pointer) return
      const rect = canvas.getBoundingClientRect()
      const position = pointerPosition(event.clientX, event.clientY, rect)
      const aspect = rect.width / Math.max(1, rect.height)
      const settings = config()
      if (!settings.colorful) pointer.color = color()
      else if (
        performance.now() - pointer.colorTime >
        1000 / settings.colorUpdateSpeed
      ) {
        pointer.color = color()
        pointer.colorTime = performance.now()
      }
      emit(event.pointerId, {
        ...position,
        dx:
          (position.x - pointer.x) * Math.min(1, aspect) * settings.splatForce,
        dy:
          ((position.y - pointer.y) / Math.max(1, aspect)) *
          settings.splatForce,
        color: pointer.color,
      })
      Object.assign(pointer, position)
    },
    { signal: events.signal },
  )
  for (const event of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ] as const) {
    canvas.addEventListener(
      event,
      (e) => {
        pointers.delete(e.pointerId)
      },
      { signal: events.signal },
    )
  }
  window.addEventListener('blur', () => pointers.clear(), {
    signal: events.signal,
  })
  return () => {
    events.abort()
    pointers.clear()
  }
}
