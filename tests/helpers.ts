import { execFileSync } from 'node:child_process'
import type { Page } from '@playwright/test'

let ipValue = Math.floor(Math.random() * 131_072)

export function uniqueIp() {
  ipValue = (ipValue + 1) % 131_072
  return `198.${18 + (ipValue >> 16)}.${(ipValue >> 8) & 255}.${ipValue & 255}`
}

export function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`
}

export function grantPro(email: string) {
  if (!/^[\w.@-]+$/.test(email)) throw new Error('Unsafe test email')
  execFileSync('docker', [
    'compose',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'mealplan',
    '-d',
    'mealplan',
    '-c',
    `update users set is_pro = true where email = '${email}'`,
  ])
}

export async function register(
  page: Page,
  email: string,
  password = 'password1',
) {
  await page.setExtraHTTPHeaders({
    'x-forwarded-for': uniqueIp(),
  })
  await page.goto('/auth/register')
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.check('input[name="termsAccepted"]')
  await page.check('input[name="privacyAcknowledged"]')
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
}

export async function login(page: Page, email: string, password = 'password1') {
  await page.goto('/auth/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
}
