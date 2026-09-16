import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  passwordResetConfigured: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))
vi.mock('$lib/server/services/auth', () => ({
  checkRateLimit: mocks.checkRateLimit,
  MAX_PASSWORD: 128,
}))
vi.mock('$lib/server/services/password-reset', () => ({
  ...mocks,
  hashResetToken: (s: string) => s,
}))
import { POST as forgot } from '../forgot-password/+server'
import { POST as reset } from './+server'
import { load } from './+page.server'

function event(body: unknown) {
  return {
    request: new Request('https://papuplan.cz/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    getClientAddress: () => '127.0.0.1',
    locals: { locale: 'en' },
    cookies: { delete: vi.fn() },
  } as any
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.checkRateLimit.mockReturnValue(true)
  mocks.passwordResetConfigured.mockReturnValue(true)
  mocks.requestPasswordReset.mockResolvedValue(undefined)
})

it('normalizes email and responds without waiting for account lookup/delivery', async () => {
  mocks.requestPasswordReset.mockReturnValue(new Promise(() => {}))
  const response = await forgot(event({ email: ' User@Example.com ' }))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ success: true })
  expect(mocks.requestPasswordReset).toHaveBeenCalledWith(
    'user@example.com',
    'en',
  )
})

it('keeps email throttling private', async () => {
  mocks.checkRateLimit.mockReturnValueOnce(true).mockReturnValueOnce(false)
  const response = await forgot(event({ email: 'user@example.com' }))
  expect(await response.json()).toEqual({ success: true })
  expect(mocks.requestPasswordReset).not.toHaveBeenCalled()
})

it('rejects malformed input and unavailable email configuration', async () => {
  for (const body of [null, {}, { email: 'invalid' }, { email: 123 }])
    expect((await forgot(event(body))).status).toBe(400)
  mocks.passwordResetConfigured.mockReturnValue(false)
  expect((await forgot(event({ email: 'user@example.com' }))).status).toBe(503)
  expect(mocks.requestPasswordReset).not.toHaveBeenCalled()
})

it('rate-limits both public endpoints before doing work', async () => {
  mocks.checkRateLimit.mockReturnValue(false)
  expect((await forgot(event({ email: 'user@example.com' }))).status).toBe(429)
  expect(
    (await reset(event({ token: 'a'.repeat(64), password: 'password1' })))
      .status,
  ).toBe(429)
  expect(mocks.resetPassword).not.toHaveBeenCalled()
  expect(mocks.requestPasswordReset).not.toHaveBeenCalled()
})

it('enforces password and token bounds', async () => {
  for (const body of [
    null,
    {},
    { token: 'bad', password: 'password1' },
    { token: 'a'.repeat(64), password: 'short' },
    { token: 'a'.repeat(64), password: 'x'.repeat(129) },
  ])
    expect((await reset(event(body))).status).toBe(400)
  expect(mocks.resetPassword).not.toHaveBeenCalled()
})

it('only clears the cookie after a successful reset', async () => {
  const e = event({ token: 'a'.repeat(64), password: 'newpassword' })
  mocks.resetPassword.mockResolvedValue(false)
  expect((await reset(e)).status).toBe(400)
  expect(e.cookies.delete).not.toHaveBeenCalled()
  mocks.resetPassword.mockResolvedValue(true)
  const successEvent = event({ token: 'a'.repeat(64), password: 'newpassword' })
  expect((await reset(successEvent)).status).toBe(200)
  expect(successEvent.cookies.delete).toHaveBeenCalledWith('session', {
    path: '/',
  })
})

it('protects the reset page from caching and referrer leaks', () => {
  const setHeaders = vi.fn()
  expect(
    load({
      url: new URL('https://papuplan.cz/auth/reset-password?token=abc'),
      setHeaders,
    } as any),
  ).toEqual({ token: 'abc' })
  expect(setHeaders).toHaveBeenCalledWith({
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  })
})

it('rejects cross-site form content types before processing credentials', async () => {
  for (const handler of [forgot, reset]) {
    const e = event({ token: 'a'.repeat(64), password: 'password1' })
    e.request.headers.set('Content-Type', 'text/plain')
    expect((await handler(e)).status).toBe(415)
  }
  expect(mocks.resetPassword).not.toHaveBeenCalled()
  expect(mocks.requestPasswordReset).not.toHaveBeenCalled()
})
