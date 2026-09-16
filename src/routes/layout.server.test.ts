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
  it.each(['/', '/pricing', '/auth/login'])(
    'allows anonymous access to %s',
    async (path) => {
      await expect(load(event(path))).resolves.toMatchObject({
        locale: 'en',
        legalNotices: [],
      })
      expect(getPendingLegalNotices).not.toHaveBeenCalled()
    },
  )

  it.each(['/planner', '/profile'])('keeps %s protected', async (path) => {
    await expect(load(event(path))).rejects.toMatchObject({
      status: 303,
      location: '/auth/login',
    })
  })

  it.each(['/', '/planner'])(
    'allows signed-in access to %s with legal notices',
    async (path) => {
      await expect(load(event(path, true))).resolves.toMatchObject({
        user: { id: 1 },
        legalNotices: [],
      })
      expect(getPendingLegalNotices).toHaveBeenCalledWith(1)
    },
  )

  it('allows public legal pages', async () => {
    const result = await load({
      locals: { user: null, locale: 'cs' },
      url: new URL('http://localhost/legal/terms'),
    } as unknown as Parameters<typeof load>[0])

    expect(result).toEqual({ user: null, locale: 'cs', legalNotices: [] })
  })
})
