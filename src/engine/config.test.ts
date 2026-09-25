import { describe, expect, it } from 'vitest'
import {
  adaptConfig,
  DEFAULT_CONFIG,
  hexToColor,
  sanitizeConfig,
} from './config'

describe('configuration boundary', () => {
  it('rejects invalid values and clamps GPU allocations', () => {
    const config = sanitizeConfig({
      dyeResolution: 1e9,
      simResolution: -1,
      pressureIterations: 12.7,
      curl: NaN,
      bloom: 'false',
      background: 'red',
      inkColor: '#aAbBcC',
      paused: true,
      splatForce: Infinity,
    })
    expect(config).toMatchObject({
      dyeResolution: 1024,
      simResolution: 32,
      pressureIterations: 13,
      curl: 30,
      bloom: true,
      background: DEFAULT_CONFIG.background,
      inkColor: '#aAbBcC',
      paused: true,
      splatForce: 6000,
    })
  })
  it.each([null, undefined, 'broken', 12])(
    'falls back safely for %s',
    (value) => {
      expect(sanitizeConfig(value)).toEqual(DEFAULT_CONFIG)
    },
  )
  it('keeps requested settings intact during capability fallback', () => {
    const input = { ...DEFAULT_CONFIG }
    expect(adaptConfig(input, false)).toMatchObject({
      dyeResolution: 512,
      shading: false,
      bloom: false,
      sunrays: false,
    })
    expect(input).toEqual(DEFAULT_CONFIG)
    expect(adaptConfig(input, true)).toEqual(input)
  })
  it('rejects saved resolutions that are absent from the controls', () => {
    expect(
      sanitizeConfig({
        simResolution: 99,
        dyeResolution: 777,
        captureResolution: 999,
      }),
    ).toMatchObject({
      simResolution: 128,
      dyeResolution: 1024,
      captureResolution: 1024,
    })
  })
  it('converts brush and background colors to linear channel values', () => {
    expect(hexToColor('#ff0080', 0.15)).toEqual({
      r: 0.15,
      g: 0,
      b: (128 / 255) * 0.15,
    })
  })
})
