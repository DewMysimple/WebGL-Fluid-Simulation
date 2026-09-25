import { useEffect, useState } from 'react'
import { detectLocale, en, zh, type Locale } from './messages'
import { readStorage, writeStorage } from '../shared/storage'

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() =>
    detectLocale(readStorage('fluid-lab.locale'), navigator.languages),
  )
  const t = locale === 'zh' ? zh : en
  useEffect(() => {
    writeStorage('fluid-lab.locale', locale)
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = `${t.title} · WebGL Fluid Simulation`
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.description)
  }, [locale, t])
  return { locale, setLocale, t }
}
