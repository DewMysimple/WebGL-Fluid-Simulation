import type { Color } from './types'

export interface FluidConfig {
  simResolution: number
  dyeResolution: number
  captureResolution: number
  densityDissipation: number
  velocityDissipation: number
  pressure: number
  pressureIterations: number
  curl: number
  splatRadius: number
  splatForce: number
  shading: boolean
  colorful: boolean
  colorUpdateSpeed: number
  paused: boolean
  background: string
  inkColor: string
  transparent: boolean
  bloom: boolean
  bloomIterations: number
  bloomResolution: number
  bloomIntensity: number
  bloomThreshold: number
  bloomSoftKnee: number
  sunrays: boolean
  sunraysResolution: number
  sunraysWeight: number
}

export const DEFAULT_CONFIG: Readonly<FluidConfig> = Object.freeze({
  simResolution: 128,
  dyeResolution: 1024,
  captureResolution: 1024,
  densityDissipation: 1,
  velocityDissipation: 0.2,
  pressure: 0.8,
  pressureIterations: 20,
  curl: 30,
  splatRadius: 0.25,
  splatForce: 6000,
  shading: true,
  colorful: true,
  colorUpdateSpeed: 10,
  paused: false,
  background: '#080b12',
  inkColor: '#68e0cf',
  transparent: false,
  bloom: true,
  bloomIterations: 8,
  bloomResolution: 256,
  bloomIntensity: 0.8,
  bloomThreshold: 0.6,
  bloomSoftKnee: 0.7,
  sunrays: true,
  sunraysResolution: 196,
  sunraysWeight: 1,
})

// Shared by controls and deserialization, so invalid persisted settings never reach the GPU.
export const NUMBER_LIMITS = {
  simResolution: [32, 256, 1],
  dyeResolution: [128, 1024, 1],
  captureResolution: [128, 2048, 1],
  densityDissipation: [0, 4, 0.05],
  velocityDissipation: [0, 4, 0.05],
  pressure: [0, 1, 0.01],
  pressureIterations: [1, 50, 1],
  curl: [0, 50, 1],
  splatRadius: [0.01, 1, 0.01],
  splatForce: [100, 12000, 100],
  colorUpdateSpeed: [0, 20, 0.5],
  bloomIterations: [2, 8, 1],
  bloomResolution: [64, 512, 1],
  bloomIntensity: [0, 2, 0.05],
  bloomThreshold: [0, 1, 0.01],
  bloomSoftKnee: [0, 1, 0.01],
  sunraysResolution: [64, 512, 1],
  sunraysWeight: [0.3, 1, 0.01],
} as const
export type NumericSetting = keyof typeof NUMBER_LIMITS
export type BooleanSetting = {
  [K in keyof FluidConfig]: FluidConfig[K] extends boolean ? K : never
}[keyof FluidConfig]

export const RESOLUTIONS = {
  simResolution: [32, 64, 128, 256],
  dyeResolution: [128, 256, 512, 1024],
  captureResolution: [512, 1024, 2048],
} as const

export function sanitizeConfig(value: unknown): FluidConfig {
  const result = { ...DEFAULT_CONFIG }
  if (!value || typeof value !== 'object') return result
  const input = value as Record<string, unknown>
  for (const key of Object.keys(NUMBER_LIMITS) as NumericSetting[]) {
    const n = input[key]
    const [min, max, step] = NUMBER_LIMITS[key]
    if (typeof n === 'number' && Number.isFinite(n)) {
      result[key] = Math.min(max, Math.max(min, step === 1 ? Math.round(n) : n))
    }
  }
  for (const key of [
    'shading',
    'colorful',
    'paused',
    'transparent',
    'bloom',
    'sunrays',
  ] as const) {
    if (typeof input[key] === 'boolean') result[key] = input[key]
  }
  for (const key of ['background', 'inkColor'] as const) {
    if (typeof input[key] === 'string' && /^#[\da-f]{6}$/i.test(input[key]))
      result[key] = input[key]
  }
  // Select controls and persisted values share the same discrete choices.
  for (const [key, choices] of Object.entries(RESOLUTIONS) as [
    keyof typeof RESOLUTIONS,
    readonly number[],
  ][]) {
    if (!choices.includes(result[key])) result[key] = DEFAULT_CONFIG[key]
  }
  return result
}

export function hexToColor(hex: string, scale = 1): Color {
  return {
    r: (parseInt(hex.slice(1, 3), 16) / 255) * scale,
    g: (parseInt(hex.slice(3, 5), 16) / 255) * scale,
    b: (parseInt(hex.slice(5, 7), 16) / 255) * scale,
  }
}

export function adaptConfig(
  config: FluidConfig,
  linearFiltering: boolean,
): FluidConfig {
  return linearFiltering
    ? config
    : {
        ...config,
        dyeResolution: Math.min(config.dyeResolution, 512),
        shading: false,
        bloom: false,
        sunrays: false,
      }
}
