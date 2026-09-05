import { beforeEach, describe, it, expect, vi } from 'vitest'

const createUser = vi.hoisted(() => vi.fn())
const findUserByEmail = vi.hoisted(() => vi.fn())

vi.mock('../repositories/accounts', () => ({ createUser, findUserByEmail }))

import {
  hashPassword,
  verifyPassword,
  generateToken,
  checkRateLimit,
  pruneLoginAttempts,
  register,
} from './auth'
import { CURRENT_LEGAL_DOCUMENTS } from '$lib/legal'

beforeEach(() => vi.clearAllMocks())

describe('hashPassword', () => {
  it('produces salt:hash format', async () => {
    const result = await hashPassword('secret')
    expect(result.split(':')).toHaveLength(2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('mypassword')
    expect(await verifyPassword('mypassword', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('mypassword')
    expect(await verifyPassword('wrongpassword', hash)).toBe(false)
  })

  it('returns false for malformed hashes', async () => {
    expect(await verifyPassword('password', 'notahash')).toBe(false)
    expect(await verifyPassword('password', ':')).toBe(false)
    expect(await verifyPassword('password', 'abc:not-hex')).toBe(false)
  })
})

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('checkRateLimit', () => {
  it('prunes inactive addresses without resetting active limits', () => {
    const clock = vi.spyOn(Date, 'now')
    const start = 2_000_000_000_000
    pruneLoginAttempts(start)
    try {
      clock.mockReturnValue(start)
      checkRateLimit('expired-address')
      clock.mockReturnValue(start + 60_000)
      for (let i = 0; i < 10; i++) checkRateLimit('active-address')
      clock.mockReturnValue(start + 15 * 60_000)
      expect(pruneLoginAttempts()).toBe(1)
      expect(pruneLoginAttempts()).toBe(0)
      expect(checkRateLimit('active-address')).toBe(false)
      expect(checkRateLimit('expired-address')).toBe(true)
    } finally {
      pruneLoginAttempts(Infinity)
      clock.mockRestore()
    }
  })
  it('blocks after 10 requests', () => {
    const ip = `test-${Date.now()}`
    for (let i = 0; i < 10; i++) expect(checkRateLimit(ip)).toBe(true)
    expect(checkRateLimit(ip)).toBe(false)
  })
})

describe('register', () => {
  it('records the current legal documents with the new account', async () => {
    findUserByEmail.mockResolvedValueOnce(null)
    createUser.mockResolvedValueOnce({ id: 42 })

    await register('new@example.com', 'password1', CURRENT_LEGAL_DOCUMENTS)

    expect(createUser).toHaveBeenCalledWith(
      'new@example.com',
      expect.any(String),
      CURRENT_LEGAL_DOCUMENTS,
    )
  })
})
