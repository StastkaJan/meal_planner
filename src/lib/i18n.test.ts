import { describe, expect, it } from 'vitest'
import { localeFromAcceptLanguage, parseLocale } from './i18n'

describe('locale resolution', () => {
  it('normalizes supported regional locales', () => {
    expect(parseLocale('cs-CZ')).toBe('cs')
    expect(parseLocale('EN_us')).toBe('en')
  })

  it('uses the first supported Accept-Language entry', () => {
    expect(localeFromAcceptLanguage('de-DE, cs-CZ;q=0.9, en;q=0.8')).toBe('cs')
  })

  it('falls back to English', () => {
    expect(localeFromAcceptLanguage('de-DE')).toBe('en')
  })
})
