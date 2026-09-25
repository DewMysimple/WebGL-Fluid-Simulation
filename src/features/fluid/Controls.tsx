import {
  DEFAULT_CONFIG,
  NUMBER_LIMITS,
  type BooleanSetting,
  type FluidConfig,
  type NumericSetting,
} from '../../engine'
import type { Messages } from '../../i18n/messages'
import { PRESETS, type Preset } from './settings'

interface Props {
  config: FluidConfig
  onChange: (next: FluidConfig) => void
  t: Messages
  limited: boolean
  onReset: () => void
}

export function Controls({ config, onChange, t, limited, onReset }: Props) {
  const update = <K extends keyof FluidConfig>(key: K, value: FluidConfig[K]) =>
    onChange({ ...config, [key]: value })
  const range = (key: NumericSetting, disabled = false) => {
    const [min, max, step] = NUMBER_LIMITS[key]
    return (
      <label className="range-field" key={key}>
        <span>
          {t[key]}
          <output>{Number(config[key].toFixed(2))}</output>
        </span>
        <input
          type="range"
          aria-label={t[key]}
          min={min}
          max={max}
          step={step}
          value={config[key]}
          disabled={disabled}
          onChange={(e) => update(key, Number(e.target.value))}
        />
      </label>
    )
  }
  const toggle = (key: BooleanSetting, disabled = false) => (
    <label className="toggle-field" key={key}>
      <span>{t[key]}</span>
      <input
        type="checkbox"
        checked={disabled ? false : config[key]}
        disabled={disabled}
        onChange={(e) => update(key, e.target.checked)}
      />
    </label>
  )
  const color = (key: 'background' | 'inkColor') => (
    <label className="color-field" key={key}>
      <span>{t[key]}</span>
      <input
        type="color"
        value={config[key]}
        onChange={(e) => update(key, e.target.value)}
      />
    </label>
  )
  return (
    <>
      <div className="preset-grid" aria-label={t.preset}>
        {(Object.keys(PRESETS) as Preset[]).map((key) => (
          <button
            type="button"
            key={key}
            onClick={() =>
              onChange({
                ...DEFAULT_CONFIG,
                ...PRESETS[key],
                dyeResolution: config.dyeResolution,
                paused: config.paused,
              })
            }
          >
            <span className={`preset-dot ${key}`} />
            {t[key]}
          </button>
        ))}
      </div>
      {limited && <p className="notice">{t.reduced}</p>}
      <details open>
        <summary>{t.simulation}</summary>
        <div className="section-fields">
          <label className="select-field">
            <span>{t.dyeResolution}</span>
            <select
              value={
                limited
                  ? Math.min(config.dyeResolution, 512)
                  : config.dyeResolution
              }
              onChange={(e) => update('dyeResolution', Number(e.target.value))}
            >
              <option value={128}>{t.veryLow}</option>
              <option value={256}>{t.low}</option>
              <option value={512}>{t.medium}</option>
              <option value={1024} disabled={limited}>
                {t.high}
              </option>
            </select>
          </label>
          {range('densityDissipation')}
          {range('velocityDissipation')}
          {range('curl')}
          {range('splatRadius')}
        </div>
      </details>
      <details open>
        <summary>{t.appearance}</summary>
        <div className="section-fields">
          {toggle('colorful')}
          {!config.colorful && color('inkColor')}
          {color('background')}
          {toggle('shading', limited)}
          {toggle('bloom', limited)}
          {config.bloom && !limited && range('bloomIntensity')}
          {toggle('sunrays', limited)}
          {config.sunrays && !limited && range('sunraysWeight')}
        </div>
      </details>
      <details>
        <summary>{t.advanced}</summary>
        <div className="section-fields">
          <label className="select-field">
            <span>{t.simResolution}</span>
            <select
              value={config.simResolution}
              onChange={(e) => update('simResolution', Number(e.target.value))}
            >
              {[32, 64, 128, 256].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {range('pressure')}
          {range('pressureIterations')}
          {range('splatForce')}
          {range('colorUpdateSpeed')}
          {range('bloomThreshold', limited)}
          {range('bloomSoftKnee', limited)}
          {range('bloomIterations', limited)}
        </div>
      </details>
      <details>
        <summary>{t.export}</summary>
        <div className="section-fields">
          {toggle('transparent')}
          <label className="select-field">
            <span>{t.captureResolution}</span>
            <select
              value={config.captureResolution}
              onChange={(e) =>
                update('captureResolution', Number(e.target.value))
              }
            >
              {[512, 1024, 2048].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <p className="field-help">{t.exportHint}</p>
        </div>
      </details>
      <button className="reset-button" type="button" onClick={onReset}>
        {t.reset}
      </button>
      <p className="attribution">
        {t.about}
        <br />
        <a
          href="https://github.com/PavelDoGreat/WebGL-Fluid-Simulation"
          target="_blank"
          rel="noreferrer"
        >
          {t.original} ↗
        </a>{' '}
        · MIT
      </p>
    </>
  )
}
