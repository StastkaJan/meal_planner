import { describe, expect, it } from 'vitest'
import {
  formatNamedCount,
  localeFromAcceptLanguage,
  localizeLabel,
  parseLocale,
  translate,
  translateMessage,
} from './i18n'

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

describe('translations', () => {
  it('translates interface text and interpolates values', () => {
    expect(translate('cs', 'Shopping list')).toBe('Nákupní seznam')
    expect(
      translate('cs', 'Page {page} of {pages}', { page: 2, pages: 4 }),
    ).toBe('Strana 2 z 4')
    expect(translate('en', 'Shopping list')).toBe('Shopping list')
  })

  it('translates known server messages and preserves unknown ones', () => {
    expect(translateMessage('cs', 'Invalid email or password')).toBe(
      'Neplatný e-mail nebo heslo',
    )
    expect(translateMessage('cs', 'Database unavailable')).toBe(
      'Database unavailable',
    )
  })

  it('localizes domain labels and Czech plural forms', () => {
    expect(localizeLabel('cs', 'morning_snack')).toBe('dopolední svačina')
    expect(formatNamedCount('cs', 1, 'recipe')).toBe('1 recept')
    expect(formatNamedCount('cs', 3, 'recipe')).toBe('3 recepty')
    expect(formatNamedCount('cs', 5, 'recipe')).toBe('5 receptů')
  })
})
