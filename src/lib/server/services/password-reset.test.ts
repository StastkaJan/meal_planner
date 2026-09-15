import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  savePasswordReset: vi.fn(),
  consumePasswordReset: vi.fn(),
  env: {
    ORIGIN: 'https://papuplan.cz',
    RESEND_API_KEY: 'test-key',
    EMAIL_FROM: 'Papuplan <reset@example.com>',
  },
}))
vi.mock('$env/dynamic/private', () => ({ env: mocks.env }))
vi.mock('../repositories/accounts', () => ({
  findUserByEmail: mocks.findUserByEmail,
}))
vi.mock('../repositories/password-resets', () => mocks)
vi.mock('../repositories/sessions', () => ({ saveSession: vi.fn() }))
import {
  hashResetToken,
  passwordResetConfigured,
  requestPasswordReset,
  resetPassword,
} from './password-reset'
import { verifyPassword } from './auth'

const fetchMock = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  mocks.savePasswordReset.mockResolvedValue(true)
  mocks.env.ORIGIN = 'https://papuplan.cz'
  mocks.env.RESEND_API_KEY = 'test-key'
})
afterEach(() => vi.unstubAllGlobals())

it('sends a localized, expiring link with only its digest stored', async () => {
  mocks.findUserByEmail.mockResolvedValue({
    id: 1,
    email: 'user@example.com',
    passwordHash: 'old-hash',
  })
  fetchMock.mockResolvedValue({ ok: true })
  const start = Date.now()
  await requestPasswordReset('user@example.com', 'cs')
  const [endpoint, request] = fetchMock.mock.calls[0]
  const email = JSON.parse(request.body)
  const link = new URL(email.text.match(/https:\/\/\S+/)[0])
  const token = link.searchParams.get('token')!
  expect(endpoint).toBe('https://api.resend.com/emails')
  expect(link.origin).toBe('https://papuplan.cz')
  expect(link.pathname).toBe('/auth/reset-password')
  expect(token).toMatch(/^[a-f0-9]{64}$/)
  expect(email.subject).toContain('obnova hesla')
  expect(email.to).toEqual(['user@example.com'])
  const [id, passwordHash, digest, expiresAt] =
    mocks.savePasswordReset.mock.calls[0]
  expect([id, passwordHash, digest]).toEqual([
    1,
    'old-hash',
    hashResetToken(token),
  ])
  expect(digest).not.toBe(token)
  expect(expiresAt.getTime()).toBeGreaterThanOrEqual(start + 30 * 60_000)
  expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 60_000)
})

it('does not send mail for an unknown account or a superseded password', async () => {
  mocks.findUserByEmail.mockResolvedValue(null)
  await requestPasswordReset('absent@example.com', 'en')
  expect(mocks.savePasswordReset).not.toHaveBeenCalled()
  mocks.findUserByEmail.mockResolvedValue({ id: 1, passwordHash: 'old' })
  mocks.savePasswordReset.mockResolvedValue(false)
  await requestPasswordReset('user@example.com', 'en')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('does not expose provider error bodies', async () => {
  mocks.findUserByEmail.mockResolvedValue({
    id: 1,
    passwordHash: 'old',
    email: 'user@example.com',
  })
  fetchMock.mockResolvedValue({ ok: false, text: () => 'sensitive data' })
  await expect(requestPasswordReset('user@example.com', 'en')).rejects.toThrow(
    'Password reset email delivery failed',
  )
})

it('requires credentials and a trusted HTTPS origin (or local development)', () => {
  expect(passwordResetConfigured()).toBe(true)
  for (const origin of [
    'http://evil.example',
    'https://user:pass@example.com',
    'invalid',
  ]) {
    mocks.env.ORIGIN = origin
    expect(passwordResetConfigured()).toBe(false)
  }
  mocks.env.ORIGIN = 'http://localhost:3000'
  expect(passwordResetConfigured()).toBe(true)
  mocks.env.RESEND_API_KEY = ''
  expect(passwordResetConfigured()).toBe(false)
})

it('hashes the new password and consumes the token by digest', async () => {
  mocks.consumePasswordReset.mockResolvedValue(true)
  expect(await resetPassword('a'.repeat(64), 'newpassword')).toBe(true)
  const [digest, passwordHash] = mocks.consumePasswordReset.mock.calls[0]
  expect(digest).toBe(hashResetToken('a'.repeat(64)))
  expect(await verifyPassword('newpassword', passwordHash)).toBe(true)
})
