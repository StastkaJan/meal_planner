import { beforeEach, describe, it, expect, vi } from 'vitest'

const createUser = vi.hoisted(() => vi.fn())
const findUserByEmail = vi.hoisted(() => vi.fn())

vi.mock('../repositories/accounts', () => ({ createUser, findUserByEmail }))

import {
  hashPassword,
  verifyPassword,
  generateToken,
  checkRateLimit,
  register,
} from './auth'

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
  it('blocks after 10 requests', () => {
    const ip = `test-${Date.now()}`
    for (let i = 0; i < 10; i++) expect(checkRateLimit(ip)).toBe(true)
    expect(checkRateLimit(ip)).toBe(false)
  })
})

describe('register', () => {
  it('records the accepted legal document versions', async () => {
    findUserByEmail.mockResolvedValue(null)
    createUser.mockResolvedValue({ id: 1 })

    await register('new@example.com', 'password1')

    expect(createUser).toHaveBeenCalledWith(
      'new@example.com',
      expect.any(String),
      {
        acceptedAt: expect.any(Date),
        version: '0.1',
      },
    )
  })
})
