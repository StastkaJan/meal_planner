import { test, expect } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.goto('/profile')
})

test('profile controls stay visible and save settings', async ({ page }) => {
  const calories = page.getByLabel('Calories (kcal)')
  await expect(calories).toBeVisible()
  await expect(page.getByLabel('Current password')).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Create plan' }).click()
  await page.goto('/profile')

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/profile') &&
        response.request().method() === 'PATCH',
    ),
    page.getByText('Italian', { exact: true }).click(),
  ])

  await calories.fill('2100')
  await page.getByRole('button', { name: 'Save targets' }).click()
  await expect(page.getByText('Targets saved.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Italian' })).toBeChecked()
  await expect(calories).toHaveValue('2100')

  await page.goto('/')
  await page.getByRole('button', { name: 'Auto-compose' }).click()
  await expect(page.locator('button.cell').first()).toContainText(
    'Pasta Bolognese',
  )
})
