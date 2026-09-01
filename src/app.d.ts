declare global {
  namespace App {
    type Locale = import('$lib/i18n').Locale

    interface Locals {
      user?: {
        id: number
        email: string
        isAdmin: boolean
        isPro: boolean
        locale: Locale | null
      }
      locale: Locale
    }
  }
}
export {}
