import { describe, expect, it } from 'vitest'
import { pointerPosition, resolution } from './math'
import { flipPixels } from './capture'

describe('render dimensions and coordinates', () => {
  it('preserves aspect ratio in portrait and landscape', () => {
    expect(resolution(128, 1600, 800)).toEqual({ width: 256, height: 128 })
    expect(resolution(128, 800, 1600)).toEqual({ width: 128, height: 256 })
  })
  it('caps extreme aspect ratios to the GPU texture limit', () => {
    expect(resolution(1024, 10000, 100, 4096)).toEqual({
      width: 4096,
      height: 41,
    })
    expect(resolution(128, 0, 0)).toEqual({ width: 128, height: 128 })
  })
  it('uses the canvas rectangle and clamps captured pointers outside it', () => {
    const rect = { left: 50, top: 100, width: 200, height: 400 }
    expect(pointerPosition(150, 200, rect)).toEqual({ x: 0.5, y: 0.75 })
    expect(pointerPosition(-1, 1000, rect)).toEqual({ x: 0, y: 0 })
  })
  it('flips screenshot rows without modifying the source', () => {
    const pixels = new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255])
    expect([...flipPixels(pixels, 1, 2)]).toEqual([
      0, 0, 255, 255, 255, 0, 0, 255,
    ])
    expect(pixels[0]).toBe(255)
  })
  it('converts premultiplied transparent export pixels', () => {
    expect([
      ...flipPixels(new Uint8Array([64, 32, 0, 128, 0, 0, 0, 0]), 2, 1, true),
    ]).toEqual([128, 64, 0, 128, 0, 0, 0, 0])
  })
})
