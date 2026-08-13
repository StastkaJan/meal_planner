import { beforeEach, describe, expect, it, vi } from 'vitest'

const register = vi.hoisted(() => vi.fn())
const createSession = vi.hoisted(() => vi.fn())

vi.mock('$lib/server/services/auth', () => ({
  checkRateLimit: () => true,
  createSession,
  MAX_PASSWORD: 128,
  register,
}))

import { actions } from './+page.server'

function request(fields: Record<string, string>) {
  return new Request('http://localhost/auth/register', {
    method: 'POST',
    body: new URLSearchParams({
      email: 'new@example.com',
      password: 'password1',
      ...fields,
    }),
  })
}

describe('register action', () => {
  beforeEach(() => vi.clearAllMocks())

  const incompleteConfirmations: Record<string, string>[] = [
    {},
    { termsAccepted: 'on' },
    { privacyAcknowledged: 'on' },
  ]

  it.each(incompleteConfirmations)(
    'rejects registration unless both legal documents are confirmed',
    async (fields) => {
      const result = await actions.default!({
        request: request(fields),
        cookies: {},
      } as any)

      expect(result).toMatchObject({
        status: 400,
        data: {
          error: 'You must accept both legal documents to create an account',
        },
      })
      expect(register).not.toHaveBeenCalled()
      expect(createSession).not.toHaveBeenCalled()
    },
  )
})
