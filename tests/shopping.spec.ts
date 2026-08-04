import { test, expect } from '@playwright/test'
import { uniqueEmail, register } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.waitForLoadState('networkidle')
})

test('shopping list sums ingredient quantities across repeated meals', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Create plan' }).click()

  // Assign the seeded "Oatmeal with Berries" meal (1 tbsp honey) to two breakfast slots.
  const breakfastCells = page.locator('button.cell.breakfast')
  for (const i of [0, 1]) {
    await breakfastCells.nth(i).click()
    await page.getByPlaceholder('Search meals…').fill('Oatmeal')
    await page
      .locator('dialog .item', { hasText: 'Oatmeal with Berries' })
      .click()
  }

  await page.getByRole('link', { name: 'Shopping list' }).click()
  await expect(page.getByText('2 tbsp Honey')).toBeVisible()
})
