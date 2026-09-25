import { useEffect, useState } from 'react'
import { DEFAULT_CONFIG } from '../engine'
import { useLocale } from '../i18n/useLocale'
import { Controls } from '../features/fluid/Controls'
import { initialSettings, saveSettings } from '../features/fluid/settings'
import { useFluidEngine } from '../features/fluid/useFluidEngine'

export function App() {
  const { locale, setLocale, t } = useLocale()
  const [config, setConfig] = useState(initialSettings)
  const [open, setOpen] = useState(
    () => !matchMedia('(max-width: 700px)').matches,
  )
  const [capturing, setCapturing] = useState(false)
  const [notice, setNotice] = useState<
    'saved' | 'captureError' | 'resetDone' | null
  >(null)
  const { canvasRef, engineRef, status } = useFluidEngine(config)
  const ready = !!status.capabilities && !status.error

  useEffect(() => {
    saveSettings(config)
  }, [config])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          event.target.closest('input, select, textarea, button, a, summary'))
      )
        return
      if (event.code === 'KeyP')
        setConfig((value) => ({ ...value, paused: !value.paused }))
      if (event.code === 'Space') {
        event.preventDefault()
        engineRef.current?.randomSplats()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [engineRef])

  async function saveImage() {
    if (!engineRef.current || capturing) return
    setCapturing(true)
    try {
      const blob = await engineRef.current.capture()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fluid-${new Date().toISOString().replaceAll(':', '-')}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('saved')
    } catch {
      setNotice('captureError')
    } finally {
      setCapturing(false)
    }
  }

  return (
    <main className="app-shell">
      <canvas
        ref={canvasRef}
        className="fluid-canvas"
        aria-label={t.canvas}
        tabIndex={0}
      />
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">
          f.
        </div>
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>
      <div className="top-actions">
        <select
          aria-label={t.language}
          value={locale}
          onChange={(e) => setLocale(e.target.value === 'zh' ? 'zh' : 'en')}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <button
          className="panel-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="controls"
          aria-label={open ? t.closeControls : t.openControls}
          onClick={() => setOpen(!open)}
        >
          {open ? '−' : '☰'}
        </button>
      </div>
      {open && (
        <aside className="control-panel" id="controls" aria-label={t.controls}>
          <div className="panel-heading">
            <h2>{t.controls}</h2>
            <span>01 — 04</span>
          </div>
          <Controls
            config={config}
            onChange={setConfig}
            t={t}
            limited={status.capabilities?.linearFiltering === false}
            onReset={() => {
              setConfig({ ...DEFAULT_CONFIG })
              setNotice('resetDone')
            }}
          />
        </aside>
      )}
      {status.error && (
        <div className="error-card" role="alert">
          <p>{t[status.error === 'capture' ? 'captureError' : status.error]}</p>
          <button type="button" onClick={() => location.reload()}>
            {t.retry}
          </button>
        </div>
      )}
      <footer className="workspace-footer">
        <div className="status-line">
          <span className={`status-dot ${config.paused ? 'is-paused' : ''}`} />
          <span>
            {ready ? (config.paused ? t.paused : t.ready) : t.loading}
          </span>
          {ready && (
            <span className="renderer-label">
              WebGL {status.capabilities?.version}
            </span>
          )}
        </div>
        <p className="canvas-hint">{t.hint}</p>
        <div className="toolbar" aria-label={t.controls}>
          <button
            className="primary"
            type="button"
            disabled={!ready}
            onClick={() => engineRef.current?.randomSplats()}
          >
            <span aria-hidden="true">✳</span>
            {t.random}
          </button>
          <button
            type="button"
            disabled={!ready}
            aria-pressed={config.paused}
            onClick={() => setConfig({ ...config, paused: !config.paused })}
          >
            {config.paused ? t.resume : t.pause}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => engineRef.current?.clear()}
          >
            {t.clear}
          </button>
          <button
            type="button"
            disabled={!ready || capturing}
            onClick={() => void saveImage()}
          >
            {capturing ? t.capturing : t.capture}
          </button>
        </div>
        <p className="keyboard-hint">{t.shortcuts}</p>
      </footer>
      <div className="toast" role="status" aria-live="polite">
        {notice ? t[notice] : ''}
      </div>
    </main>
  )
}
