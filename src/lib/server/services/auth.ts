import { hashPassword, verifyLogin } from '$lib/auth'
import { createUser, findUserByEmail } from '../repositories/accounts'

export async function authenticate(email: string, password: string) {
  const user = await findUserByEmail(email)
  return (await verifyLogin(password, user?.passwordHash)) ? user : null
}

export async function register(email: string, password: string) {
  if (await findUserByEmail(email)) return null
  return createUser(email, await hashPassword(password))
}
