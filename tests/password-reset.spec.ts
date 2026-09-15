import { test, expect } from '@playwright/test'
import { randomBytes, createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { login, register, uniqueEmail } from './helpers'

function seedReset(email: string, expired = false) {
  if (!/^[\w.@-]+$/.test(email)) throw new Error('Unsafe test email')
  const token = randomBytes(32).toString('hex')
  const digest = createHash('sha256').update(token).digest('hex')
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
    `insert into password_resets (user_id, token_hash, password_hash, expires_at)
     select id, '${digest}', password_hash, now() ${expired ? '-' : '+'} interval '30 minutes' from users where email = '${email}'
     on conflict (user_id) do update set token_hash = excluded.token_hash, password_hash = excluded.password_hash, expires_at = excluded.expires_at`,
  ])
  return token
}

test('@smoke forgot password form confirms a reset request', async ({
  page,
}) => {
  await page.route('**/auth/forgot-password', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    expect(route.request().postDataJSON()).toEqual({
      email: 'unknown@example.com',
    })
    await route.fulfill({ json: { success: true } })
  })
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email', { exact: true }).fill('unknown@example.com')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toContainText('If an account exists')
})

test('@smoke reset form validates confirmation and submits the new password', async ({
  page,
}) => {
  const token = 'a'.repeat(64)
  await page.route('**/auth/reset-password', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token,
      password: 'newpassword1',
    })
    await route.fulfill({ json: { success: true } })
  })
  await page.goto(`/auth/reset-password?token=${token}`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel('New password', { exact: true }).fill('newpassword1')
  await page.getByLabel('Confirm password').fill('different')
  await page.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match')
  await page.getByLabel('Confirm password').fill('newpassword1')
  await page.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Your password has been reset',
  )
  await page.getByRole('link', { name: 'Back to sign in' }).click()
  await expect(page).toHaveURL('/auth/login')
})

test('@smoke reset rejects expiry and replay, revokes sessions, and serializes concurrent redemptions', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail()
  await register(page, email)
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' })
  const resetPage = await context.newPage()
  try {
    const expired = seedReset(email, true)
    const expiredResponse = await resetPage.request.post(
      '/auth/reset-password',
      { data: { token: expired, password: 'newpassword1' } },
    )
    expect(expiredResponse.status()).toBe(400)
    const token = seedReset(email)
    await resetPage.goto(`/auth/reset-password?token=${token}`)
    await resetPage.waitForLoadState('networkidle')
    await resetPage
      .getByLabel('New password', { exact: true })
      .fill('newpassword1')
    await resetPage.getByLabel('Confirm password').fill('different')
    await resetPage.getByRole('button', { name: 'Reset password' }).click()
    await expect(resetPage.getByRole('alert')).toHaveText(
      'Passwords do not match',
    )
    await resetPage.getByLabel('Confirm password').fill('newpassword1')
    await resetPage.getByRole('button', { name: 'Reset password' }).click()
    await expect(resetPage.getByRole('status')).toContainText(
      'Your password has been reset',
    )
    await page.goto('/profile')
    await expect(page).toHaveURL('/auth/login')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill('password1')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.locator('.error')).toContainText(
      'Invalid email or password',
    )
    await login(page, email, 'newpassword1')
    expect(
      (
        await resetPage.request.post('/auth/reset-password', {
          data: { token, password: 'replayedpassword' },
        })
      ).status(),
    ).toBe(400)
    const nextToken = seedReset(email)
    const results = await Promise.all(
      [1, 2].map(() =>
        resetPage.request.post('/auth/reset-password', {
          data: { token: nextToken, password: 'finalpassword1' },
        }),
      ),
    )
    expect(results.map((r) => r.status()).sort()).toEqual([200, 400])
  } finally {
    await context.close()
  }
})
