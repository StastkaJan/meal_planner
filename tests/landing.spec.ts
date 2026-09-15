import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('@smoke visitors discover the product and can create an account', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL('/welcome')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Less deciding.More enjoying.',
  )
  await page.getByRole('link', { name: 'See how it works' }).click()
  await expect(page).toHaveURL('/welcome#how-it-works')
  await expect(
    page.getByRole('heading', { name: 'A simpler rhythm for your week.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Our vision', exact: true }).click()
  await expect(page).toHaveURL('/welcome#vision')
  await expect(
    page.getByText('We believe eating well should fit into your life.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Create your free account' }).click()
  await expect(page).toHaveURL('/auth/register')
})

test('Czech visitors see a localized landing page on mobile', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'locale', value: 'cs', url: 'http://localhost:3000' },
  ])
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/welcome')
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Méně rozhodování.Více radosti.',
  )
  await expect(
    page.getByRole('link', { name: 'Plánovat zdarma' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('link', { name: 'Přihlásit se', exact: true }).click()
  await expect(page).toHaveURL('/auth/login')
})

test('signed-in users keep their planner and can return from the introduction', async ({
  page,
}) => {
  await register(page, uniqueEmail())
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
    'Less deciding.More enjoying.',
  )
  await page.goto('/welcome')
  await page.getByRole('link', { name: 'Open planner' }).first().click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('nav button[type="submit"]')).toHaveText('Sign out')
})
