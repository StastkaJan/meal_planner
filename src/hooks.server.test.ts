import { beforeEach, expect, it, vi } from 'vitest'
import type { Handle } from '@sveltejs/kit'
import { findSessionUser } from '$lib/server/repositories/sessions'
import { handle } from './hooks.server'

vi.mock('$lib/server/repositories/sessions', () => ({
  findSessionUser: vi.fn(),
}))
vi.mock('$lib/server/observability', () => ({
  observeRequests: vi.fn(),
}))
vi.mock('@sveltejs/kit/hooks', () => ({
  sequence: (_observability: Handle, authenticate: Handle) => authenticate,
}))

beforeEach(() => vi.clearAllMocks())

it.each([
  ['/?lang=cs', null, 'en', 'cs', true],
  ['/?lang=en', 'cs', 'cs', 'en', true],
  ['/?lang=invalid', null, 'cs', 'cs', false],
  ['/?lang=invalid', 'en', 'cs', 'en', false],
  ['/planner?lang=cs', 'en', 'cs', 'en', false],
  ['/auth/register', null, 'cs', 'cs', false],
] as const)(
  'resolves %s with account %s and cookie %s to %s',
  async (path, accountLocale, cookieLocale, expected, savesCookie) => {
    if (accountLocale) {
      vi.mocked(findSessionUser).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        isAdmin: false,
        isPro: false,
        locale: accountLocale,
      })
    }
    const event = {
      url: new URL(path, 'http://localhost'),
      request: new Request('http://localhost', {
        headers: { 'accept-language': 'en' },
      }),
      locals: {} as App.Locals,
      cookies: {
        get: (name: string) =>
          name === 'session'
            ? accountLocale
              ? 'session-token'
              : undefined
            : cookieLocale,
        set: vi.fn(),
      },
    }
    const resolve = vi.fn(
      async (_event, options) =>
        new Response(
          await options.transformPageChunk({
            html: '<html lang="%lang%">',
            done: true,
          }),
        ),
    )
    const response = await handle({ event, resolve } as unknown as Parameters<
      typeof handle
    >[0])
    expect(event.locals.locale).toBe(expected)
    expect(await response.text()).toBe(`<html lang="${expected}">`)
    if (savesCookie) {
      expect(event.cookies.set).toHaveBeenCalledWith('locale', expected, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
    } else {
      expect(event.cookies.set).not.toHaveBeenCalled()
    }
    if (accountLocale) expect(event.locals.user?.locale).toBe(accountLocale)
  },
)
