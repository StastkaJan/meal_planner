import { promisify } from 'util'
import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import type { Cookies } from '@sveltejs/kit'
import { createUser, findUserByEmail } from '../repositories/accounts'
import { saveSession } from '../repositories/sessions'
import { monitorService } from '../observability'

const scryptAsync = promisify(scrypt)
const DUMMY_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 15 * 60 * 1000

export const MAX_PASSWORD = 128
export const generateToken = () => randomBytes(32).toString('hex')

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [salt, hash] = parts
  if (!salt || !hash) return false
  let derived: Buffer
  try {
    derived = (await scryptAsync(password, salt, 64)) as Buffer
  } catch {
    return false
  }
  const storedHash = Buffer.from(hash, 'hex')
  if (storedHash.length !== derived.length) return false
  return timingSafeEqual(storedHash, derived)
}

export async function verifyLogin(
  password: string,
  storedHash: string | undefined,
) {
  return verifyPassword(password, storedHash ?? DUMMY_HASH)
}

// ponytail: in-memory, single-instance; move to a store if the app scales out.
export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function authenticate(email: string, password: string) {
  return monitorService('auth', 'authenticate', async () => {
    const user = await findUserByEmail(email)
    return (await verifyLogin(password, user?.passwordHash)) ? user : null
  })
}

export async function register(email: string, password: string) {
  return monitorService('auth', 'register', async () => {
    if (await findUserByEmail(email)) return null
    return createUser(email, await hashPassword(password))
  })
}

export async function createSession(userId: number, cookies: Cookies) {
  return monitorService('auth', 'create_session', async () => {
    const token = generateToken()
    await saveSession(
      token,
      userId,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    )
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    })
  })
}
