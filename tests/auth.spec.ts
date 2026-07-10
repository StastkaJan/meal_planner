import { test, expect } from '@playwright/test'
import { uniqueEmail, register, login } from './helpers'

test('register creates account and shows user in nav', async ({ page }) => {
  await register(page, uniqueEmail())
  await expect(page.locator('nav button[type="submit"]')).toHaveText('Sign out')
})

test('login with valid credentials redirects to /', async ({ page }) => {
  const email = uniqueEmail()
  await register(page, email)
  await page.click('nav button[type="submit"]')
  await page.waitForURL('/auth/login')

  await login(page, email)
  await expect(page.locator('nav button[type="submit"]')).toHaveText('Sign out')
})

test('login with wrong password shows error', async ({ page }) => {
  const email = uniqueEmail()
  await register(page, email)
  await page.click('nav button[type="submit"]')
  await page.waitForURL('/auth/login')

  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  await expect(page.locator('.error')).toContainText(
    'Invalid email or password',
  )
})

test('logout redirects to login page', async ({ page }) => {
  await register(page, uniqueEmail())
  await page.click('nav button[type="submit"]')
  await expect(page).toHaveURL('/auth/login')
})
