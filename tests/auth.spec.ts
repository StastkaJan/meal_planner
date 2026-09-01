import { test, expect } from '@playwright/test'
import { CURRENT_LEGAL_DOCUMENTS } from '../src/lib/legal'
import { uniqueEmail, uniqueIp, register, login } from './helpers'

test('@smoke register creates account and shows user in nav', async ({
  page,
}) => {
  await register(page, uniqueEmail())
  await expect(page.locator('nav button[type="submit"]')).toHaveText('Sign out')
})

const legalVersions = Object.fromEntries(
  CURRENT_LEGAL_DOCUMENTS.map(({ document, version }) => [
    `${document}Version`,
    version,
  ]),
)

for (const [missingDocument, acceptance] of [
  ['terms', { privacyAcknowledged: 'on' }],
  ['privacy', { termsAccepted: 'on' }],
] as const) {
  test(`@smoke registration without ${missingDocument} acceptance fails without creating an account`, async ({
    page,
  }) => {
    const email = uniqueEmail()
    const response = await page.request.post('/auth/register', {
      form: { email, password: 'password1', ...legalVersions, ...acceptance },
      headers: {
        origin: 'http://localhost:3000',
        'x-forwarded-for': uniqueIp(),
      },
      maxRedirects: 0,
    })

    expect(await response.text()).toContain(
      'You must accept both legal documents to create an account',
    )

    await register(page, email)
    await expect(page.locator('nav button[type="submit"]')).toHaveText(
      'Sign out',
    )
  })
}

test('@smoke protected pages redirect unauthenticated users to login', async ({
  page,
}) => {
  await page.goto('/profile')
  await expect(page).toHaveURL('/auth/login')
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
