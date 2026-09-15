import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  savePasswordReset: vi.fn(),
  consumePasswordReset: vi.fn(),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  env: {
    ORIGIN: 'https://papuplan.cz',
    SMTP2GO_USERNAME: ' papuplan-smtp ',
    SMTP2GO_PASSWORD: ' smtp password ',
    EMAIL_FROM: ' noreply@papuplan.cz ',
  },
}))
vi.mock('$env/dynamic/private', () => ({ env: mocks.env }))
vi.mock('nodemailer', () => ({
  default: { createTransport: mocks.createTransport },
}))
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

beforeEach(() => {
  vi.resetAllMocks()
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail })
  mocks.sendMail.mockResolvedValue({ accepted: ['user@example.com'] })
  mocks.savePasswordReset.mockResolvedValue(true)
  mocks.env.ORIGIN = 'https://papuplan.cz'
  mocks.env.SMTP2GO_USERNAME = ' papuplan-smtp '
  mocks.env.SMTP2GO_PASSWORD = ' smtp password '
  mocks.env.EMAIL_FROM = ' noreply@papuplan.cz '
})

it.each(['en', 'cs'] as const)(
  'sends a localized %s link through authenticated SMTP2GO TLS with only its digest stored',
  async (locale) => {
    mocks.findUserByEmail.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      passwordHash: 'old-hash',
    })
    const start = Date.now()
    await requestPasswordReset('user@example.com', locale)
    const email = mocks.sendMail.mock.calls[0][0]
    const link = new URL(email.text.match(/https:\/\/\S+/)[0])
    const token = link.searchParams.get('token')!
    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: 'mail.smtp2go.com',
      port: 465,
      secure: true,
      auth: { user: 'papuplan-smtp', pass: ' smtp password ' },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      dnsTimeout: 10_000,
    })
    expect(email.from).toEqual({
      name: 'Papu Plan',
      address: 'noreply@papuplan.cz',
    })
    expect(link.origin).toBe('https://papuplan.cz')
    expect(link.pathname).toBe('/auth/reset-password')
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(email.subject).toContain(
      locale === 'cs' ? 'obnova hesla' : 'reset your password',
    )
    expect(email.text).toContain(
      locale === 'cs' ? 'platí 30 minut' : 'valid for 30 minutes',
    )
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
  },
)

it('does not send mail for an unknown account or a superseded password', async () => {
  mocks.findUserByEmail.mockResolvedValue(null)
  await requestPasswordReset('absent@example.com', 'en')
  expect(mocks.savePasswordReset).not.toHaveBeenCalled()
  mocks.findUserByEmail.mockResolvedValue({ id: 1, passwordHash: 'old' })
  mocks.savePasswordReset.mockResolvedValue(false)
  await requestPasswordReset('user@example.com', 'en')
  expect(mocks.createTransport).not.toHaveBeenCalled()
  expect(mocks.sendMail).not.toHaveBeenCalled()
})

it('does not expose SMTP error details', async () => {
  mocks.findUserByEmail.mockResolvedValue({
    id: 1,
    passwordHash: 'old',
    email: 'user@example.com',
  })
  const providerError = new Error(
    '535 credentials or user@example.com rejected',
  )
  mocks.sendMail.mockRejectedValue(providerError)
  await expect(requestPasswordReset('user@example.com', 'en')).rejects.toThrow(
    'Password reset email delivery failed',
  )
  await expect(requestPasswordReset('user@example.com', 'en')).rejects.not.toBe(
    providerError,
  )
})

it.each(['SMTP2GO_USERNAME', 'SMTP2GO_PASSWORD', 'EMAIL_FROM'] as const)(
  'does not issue a link when %s is missing',
  async (key) => {
    mocks.env[key] = '   '
    expect(passwordResetConfigured()).toBe(false)
    await expect(
      requestPasswordReset('user@example.com', 'en'),
    ).rejects.toThrow('Password reset email is not configured')
    expect(mocks.findUserByEmail).not.toHaveBeenCalled()
    expect(mocks.savePasswordReset).not.toHaveBeenCalled()
    expect(mocks.createTransport).not.toHaveBeenCalled()
  },
)

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
})

it('hashes the new password and consumes the token by digest', async () => {
  mocks.consumePasswordReset.mockResolvedValue(true)
  expect(await resetPassword('a'.repeat(64), 'newpassword')).toBe(true)
  const [digest, passwordHash] = mocks.consumePasswordReset.mock.calls[0]
  expect(digest).toBe(hashResetToken('a'.repeat(64)))
  expect(await verifyPassword('newpassword', passwordHash)).toBe(true)
})
