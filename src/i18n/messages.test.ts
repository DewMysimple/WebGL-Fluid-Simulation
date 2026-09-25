import { describe, expect, it } from 'vitest'
import { detectLocale, en, zh } from './messages'

describe('language selection', () => {
  it('uses explicit preference before the browser language', () => {
    expect(detectLocale('en', ['zh-CN'])).toBe('en')
    expect(detectLocale('zh', ['en-US'])).toBe('zh')
  })
  it('recognizes Chinese locales and falls back to English', () => {
    expect(detectLocale(null, ['zh-TW'])).toBe('zh')
    expect(detectLocale('invalid', ['fr-FR'])).toBe('en')
    expect(detectLocale(null, [])).toBe('en')
  })
  it('ships a nonempty translation for every interface key', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    expect(Object.values(en).every((value) => value.trim().length > 0)).toBe(
      true,
    )
  })
})
