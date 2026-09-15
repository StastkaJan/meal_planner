import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPendingLegalNotices } from '$lib/server/services/legal'

vi.mock('$lib/server/services/legal', () => ({
  getPendingLegalNotices: vi.fn().mockResolvedValue([]),
}))

import { load } from './+layout.server'

beforeEach(() => vi.clearAllMocks())

function event(path: string, signedIn = false) {
  return {
    url: new URL(path, 'http://localhost'),
    locals: { user: signedIn ? { id: 1 } : undefined, locale: 'en' },
  } as Parameters<typeof load>[0]
}

describe('root layout access', () => {
  it('sends anonymous home visits to the introduction without fetching account data', async () => {
    await expect(load(event('/'))).rejects.toMatchObject({
      status: 303,
      location: '/welcome',
    })
    expect(getPendingLegalNotices).not.toHaveBeenCalled()
  })

  it.each(['/welcome', '/pricing', '/auth/login'])(
    'allows anonymous access to %s',
    async (path) => {
      await expect(load(event(path))).resolves.toMatchObject({
        locale: 'en',
        legalNotices: [],
      })
      expect(getPendingLegalNotices).not.toHaveBeenCalled()
    },
  )

  it('keeps account pages protected', async () => {
    await expect(load(event('/profile'))).rejects.toMatchObject({
      status: 303,
      location: '/auth/login',
    })
  })

  it('keeps the signed-in homepage accessible with legal notices', async () => {
    await expect(load(event('/', true))).resolves.toMatchObject({
      user: { id: 1 },
      legalNotices: [],
    })
    expect(getPendingLegalNotices).toHaveBeenCalledWith(1)
  })

  it('allows public legal pages', async () => {
    const result = await load({
      locals: { user: null, locale: 'cs' },
      url: new URL('http://localhost/legal/terms'),
    } as unknown as Parameters<typeof load>[0])

    expect(result).toEqual({ user: null, locale: 'cs', legalNotices: [] })
  })
})
