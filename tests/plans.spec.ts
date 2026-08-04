import { test, expect } from '@playwright/test'
import { uniqueEmail, register } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.waitForLoadState('networkidle')
})

test('create a plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Create plan' }).click()
  await expect(page.getByRole('link', { name: 'Shopping list' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Create plan' }),
  ).not.toBeVisible()
})

test('delete a plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Create plan' }).click()

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Create plan' })).toBeVisible()
})

test('a joined repeat pattern propagates a slot pick to the rest of the group', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Create plan' }).click()

  await page.getByText('Plan settings').click()
  const lunchRepeatRow = page
    .locator('.repeat-row')
    .filter({ has: page.locator('.mt-label', { hasText: 'lunch' }) })
  await lunchRepeatRow.locator('.gap').first().click() // join Mon|Tue

  const lunchRow = page
    .locator('tbody tr')
    .filter({ has: page.locator('.row-label', { hasText: 'lunch' }) })
  const lunchCells = lunchRow.locator('.slot-cell')

  await lunchCells.nth(0).locator('button.cell').click()
  await page.getByPlaceholder('Search meals\u2026').fill('Grilled Chicken')
  await page.getByRole('button', { name: /Grilled Chicken/ }).click()

  await expect(lunchCells.nth(0)).toContainText('Grilled Chicken')
  await expect(lunchCells.nth(1)).toContainText('Grilled Chicken') // Tue joined to Mon
  await expect(lunchCells.nth(2)).not.toContainText('Grilled Chicken') // Wed not joined
})
