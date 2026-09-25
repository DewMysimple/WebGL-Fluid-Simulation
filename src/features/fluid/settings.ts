import { DEFAULT_CONFIG, sanitizeConfig, type FluidConfig } from '../../engine'
import { readStorage, writeStorage } from '../../shared/storage'

const STORAGE_KEY = 'fluid-lab.settings.v1'
export const PRESETS = {
  balanced: {},
  ink: {
    densityDissipation: 0.45,
    velocityDissipation: 1.2,
    curl: 8,
    colorful: false,
    inkColor: '#91c9fa',
    bloom: false,
    sunrays: false,
  },
  smoke: {
    densityDissipation: 0.65,
    velocityDissipation: 0.35,
    curl: 45,
    splatRadius: 0.4,
    colorful: false,
    inkColor: '#c5a8ef',
    bloomIntensity: 0.35,
  },
} satisfies Record<string, Partial<FluidConfig>>
export type Preset = keyof typeof PRESETS

export function initialSettings(): FluidConfig {
  let value: unknown
  try {
    value = JSON.parse(readStorage(STORAGE_KEY) || 'null')
  } catch {
    /* Ignore corrupted preferences. */
  }
  if (
    value &&
    typeof value === 'object' &&
    'version' in value &&
    value.version === 1 &&
    'config' in value
  ) {
    return {
      ...sanitizeConfig(value.config),
      paused: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  }
  return {
    ...DEFAULT_CONFIG,
    dyeResolution: matchMedia('(pointer: coarse)').matches ? 512 : 1024,
    paused: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

export function saveSettings(config: FluidConfig): void {
  writeStorage(STORAGE_KEY, JSON.stringify({ version: 1, config }))
}
