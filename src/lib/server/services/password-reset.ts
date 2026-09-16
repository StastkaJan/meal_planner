import { createHash } from 'node:crypto'
import { env } from '$env/dynamic/private'
import nodemailer from 'nodemailer'
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
  if (
    !env.SMTP2GO_USERNAME?.trim() ||
    !env.SMTP2GO_PASSWORD?.trim() ||
    !env.EMAIL_FROM?.trim() ||
    !env.ORIGIN
  )
    return false
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
    const sender = env.EMAIL_FROM?.trim()
    const username = env.SMTP2GO_USERNAME?.trim()
    const password = env.SMTP2GO_PASSWORD
    if (!sender || !username || !password?.trim())
      throw new Error('Password reset email is not configured')
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
    const transport = nodemailer.createTransport({
      host: 'mail.smtp2go.com',
      port: 465,
      secure: true,
      auth: {
        user: username,
        pass: password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      dnsTimeout: 10_000,
    })
    await transport
      .sendMail({
        from: { name: 'Papu Plan', address: sender },
        to: [user.email],
        subject:
          locale === 'cs'
            ? 'Papuplan: obnova hesla'
            : 'Papuplan: reset your password',
        text:
          locale === 'cs'
            ? `Nové heslo si nastavíte na tomto odkazu (platí 30 minut):\n\n${link}\n\nPokud jste o obnovu hesla nežádali, tento e-mail ignorujte.`
            : `Set a new password using this link (valid for 30 minutes):\n\n${link}\n\nIf you did not request a password reset, ignore this email.`,
      })
      .catch(() => {
        // SMTP errors can contain addresses or credentials; log a generic failure.
        throw new Error('Password reset email delivery failed')
      })
  })
}

export async function resetPassword(token: string, password: string) {
  return consumePasswordReset(
    hashResetToken(token),
    await hashPassword(password),
  )
}
