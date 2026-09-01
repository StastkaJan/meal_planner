import { describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/services/legal', () => ({
  getPendingLegalNotices: vi.fn(),
}))

import { load } from './+layout.server'

describe('root layout access', () => {
  it('allows public legal pages', async () => {
    const result = await load({
      locals: { user: null, locale: 'cs' },
      url: new URL('http://localhost/legal/terms'),
    } as unknown as Parameters<typeof load>[0])

    expect(result).toEqual({ user: null, locale: 'cs', legalNotices: [] })
  })
})
