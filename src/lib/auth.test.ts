import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  checkRateLimit,
} from './auth'

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

  it('returns false for malformed hash (no colon)', async () => {
    expect(await verifyPassword('password', 'notahash')).toBe(false)
  })

  it('returns false for empty salt or hash', async () => {
    expect(await verifyPassword('password', ':')).toBe(false)
    expect(await verifyPassword('password', 'abc:')).toBe(false)
  })

  it('returns false for non-hex hash', async () => {
    expect(await verifyPassword('password', 'abc:not-hex')).toBe(false)
  })
})

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('checkRateLimit', () => {
  it('allows first request', () => {
    expect(checkRateLimit('test-ip-1')).toBe(true)
  })

  it('blocks after 10 requests', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('test-ip-2')
    expect(checkRateLimit('test-ip-2')).toBe(false)
  })
})
