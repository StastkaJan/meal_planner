import { createHash } from 'node:crypto'
import { env } from '$env/dynamic/private'
import type { Locale } from '$lib/i18n'
import { findUserByEmail } from '../repositories/accounts'
import {
  consumePasswordReset,
  savePasswordReset,
} from '../repositories/password-resets'
import { generateToken, hashPassword } from './auth'
import { monitorService } from '../observability'

export const hashResetToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')

export function passwordResetConfigured() {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.ORIGIN) return false
  try {
    const url = new URL(env.ORIGIN)
    return (
      !url.username &&
      !url.password &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
  } catch {
    return false
  }
}

export async function requestPasswordReset(email: string, locale: Locale) {
  return monitorService('auth', 'request_password_reset', async () => {
    const user = await findUserByEmail(email)
    if (!user) return
    const token = generateToken()
    if (
      !(await savePasswordReset(
        user.id,
        user.passwordHash,
        hashResetToken(token),
        new Date(Date.now() + 30 * 60_000),
      ))
    )
      return
    const link = new URL('/auth/reset-password', env.ORIGIN)
    link.searchParams.set('token', token)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [user.email],
        subject:
          locale === 'cs'
            ? 'Papuplan: obnova hesla'
            : 'Papuplan: reset your password',
        text:
          locale === 'cs'
            ? `Nové heslo si nastavíte na tomto odkazu (platí 30 minut):\n\n${link}\n\nPokud jste o obnovu hesla nežádali, tento e-mail ignorujte.`
            : `Set a new password using this link (valid for 30 minutes):\n\n${link}\n\nIf you did not request a password reset, ignore this email.`,
      }),
    })
    // Never include the provider response, email address, or reset link in logs.
    if (!response.ok) throw new Error('Password reset email delivery failed')
  })
}

export async function resetPassword(token: string, password: string) {
  return consumePasswordReset(
    hashResetToken(token),
    await hashPassword(password),
  )
}
