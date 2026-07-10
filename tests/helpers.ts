import type { Page } from '@playwright/test'

export function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`
}

export async function register(
  page: Page,
  email: string,
  password = 'password1',
) {
  await page.goto('/auth/register')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
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
