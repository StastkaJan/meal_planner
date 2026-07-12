import { promisify } from 'util'
import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/db'
import { sessions } from '$lib/schema'
import type { Cookies } from '@sveltejs/kit'

const scryptAsync = promisify(scrypt)

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
  const buf = Buffer.from(hash, 'hex')
  if (buf.length !== derived.length) return false
  return timingSafeEqual(buf, derived)
}

export const generateToken = () => randomBytes(32).toString('hex')

// ponytail: in-memory, single-instance; move to a store if the app scales out.
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 15 * 60 * 1000

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

// Dummy hash so timing of "user not found" matches "wrong password".
// Generated once at import time; never hits the DB.
const DUMMY_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`

export async function verifyLogin(
  password: string,
  storedHash: string | undefined,
) {
  return verifyPassword(password, storedHash ?? DUMMY_HASH)
}

export const MAX_PASSWORD = 128

export function requireUser(locals: App.Locals) {
  if (!locals.user) error(401, 'Not authenticated')
  return locals.user
}

export async function createSession(userId: number, cookies: Cookies) {
  const token = generateToken()
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })
  cookies.set('session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
  })
}
