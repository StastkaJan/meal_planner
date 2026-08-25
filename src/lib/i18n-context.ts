import { getContext, setContext } from 'svelte'
import {
  formatCount,
  formatNamedCount,
  localizeLabel,
  translate,
  translateMessage,
  type Locale,
  type CountedNoun,
  type MessageKey,
  type MessageParams,
  type PluralForms,
} from './i18n'

const I18N = Symbol('i18n')

export function provideI18n(getLocale: () => Locale) {
  const context = {
    locale: getLocale,
    t: (key: MessageKey, params?: MessageParams) =>
      translate(getLocale(), key, params),
    message: (value: string) => translateMessage(getLocale(), value),
    label: (value: string) => localizeLabel(getLocale(), value),
    count: (value: number, forms: PluralForms) =>
      formatCount(getLocale(), value, forms),
    namedCount: (value: number, noun: CountedNoun) =>
      formatNamedCount(getLocale(), value, noun),
  }
  setContext(I18N, context)
  return context
}

export function useI18n() {
  const context = getContext<ReturnType<typeof provideI18n>>(I18N)
  if (!context) throw new Error('Missing i18n context')
  return context
}
