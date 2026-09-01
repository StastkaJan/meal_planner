import { test, expect } from '@playwright/test'
import { uniqueEmail, register } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.goto('/meals')
  await page.waitForLoadState('networkidle')
})

test('create a meal', async ({ page }) => {
  const name = `Meal-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await expect(page.getByText(name)).toBeVisible()

  await page.getByRole('button', { name: 'My recipes only' }).click()
  await expect(page.getByText(name)).toBeVisible()
  await expect(page.getByText('Pasta Bolognese')).not.toBeVisible()
})

test('delete a meal', async ({ page }) => {
  const name = `Del-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await page.getByText(name).waitFor()

  page.once('dialog', (d) => d.accept())
  await page
    .locator('tr', { hasText: name })
    .getByRole('button', { name: 'Delete' })
    .click()
  await expect(page.getByText(name)).not.toBeVisible()
})

test('shows delete failures on the recipe list and detail page', async ({
  page,
}) => {
  const name = `Delete-error-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()

  const row = page.locator('tr', { hasText: name })
  const detailHref = await row.getByRole('link', { name }).getAttribute('href')
  expect(detailHref).not.toBeNull()
  await page.route(`**${detailHref}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Request failed' }),
      })
    } else {
      await route.continue()
    }
  })

  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('alert')).toHaveText('Request failed')
  await expect(row).toBeVisible()

  await row.getByRole('link', { name }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('alert')).toHaveText('Request failed')
  await expect(page).toHaveURL(detailHref!)
})
