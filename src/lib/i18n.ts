export const SUPPORTED_LOCALES = ['en', 'cs'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  cs: 'Čeština',
}

export function parseLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null
  const language = value.trim().toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LOCALES.find((locale) => locale === language) ?? null
}

export function localeFromAcceptLanguage(value: string | null): Locale {
  if (!value) return DEFAULT_LOCALE
  for (const item of value.split(',')) {
    const locale = parseLocale(item.split(';')[0])
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}
