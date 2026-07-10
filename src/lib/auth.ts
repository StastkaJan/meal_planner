import { promisify } from 'util'
import { randomBytes, scrypt, timingSafeEqual } from 'crypto'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(Buffer.from(hash, 'hex'), derived)
}

export const generateToken = () => randomBytes(32).toString('hex')
