export const CURRENT_LEGAL_DOCUMENTS = [
  {
    document: 'terms',
    version: '0.1',
    action: 'accepted',
    href: '/legal/terms.md',
  },
  {
    document: 'privacy',
    version: '0.1',
    action: 'acknowledged',
    href: '/legal/privacy.md',
  },
] as const

export type LegalDocument = (typeof CURRENT_LEGAL_DOCUMENTS)[number]['document']
export type LegalNotice = (typeof CURRENT_LEGAL_DOCUMENTS)[number]
