import { test, expect } from '@playwright/test'
import { uniqueEmail, register } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.goto('/meals')
  await page.waitForLoadState('networkidle')
})

test('rejects a new meal without its required name', async ({ page }) => {
  const response = await page.request.post('/meals', { data: {} })

  expect(response.status()).toBe(400)
})

test('rejects a whitespace-only meal name', async ({ page }) => {
  const response = await page.request.post('/meals', {
    data: { name: '   ' },
  })

  test.fail(true, 'Known gap: meal names are not trimmed before validation')
  expect(response.status()).toBe(400)
})

for (const [field, value] of [
  ['calories', -1],
  ['servings', 0],
] as const) {
  test(`rejects an invalid ${field} value`, async ({ page }) => {
    const response = await page.request.post('/meals', {
      data: { name: 'Invalid meal', [field]: value },
    })

    test.fail(true, 'Known gap: meal numeric fields lack server validation')
    expect(response.status()).toBe(400)
  })
}

for (const [caseName, ingredient] of [
  ['without a name field', { qty: 1, unit: 'cup' }],
  ['with a blank name', { name: '', qty: 1, unit: 'cup' }],
  ['with a negative quantity', { name: 'Flour', qty: -1, unit: 'cup' }],
  ['with an unsupported unit', { name: 'Flour', qty: 1, unit: 'bucket' }],
  ['with a unit but no quantity', { name: 'Flour', qty: null, unit: 'cup' }],
] as const) {
  test(`rejects an ingredient ${caseName}`, async ({ page }) => {
    const response = await page.request.post('/meals', {
      data: { name: 'Invalid ingredient', ingredients: [ingredient] },
    })

    test.fail(true, 'Known gap: ingredient payloads lack server validation')
    expect(response.status()).toBe(400)
  })
}

test('rejects a malformed ingredient collection', async ({ page }) => {
  const response = await page.request.post('/meals', {
    data: {
      name: 'Invalid ingredients',
      ingredients: { name: 'Flour', qty: 1, unit: 'cup' },
    },
  })

  test.fail(true, 'Known gap: malformed ingredient payloads return 500')
  expect(response.status()).toBe(400)
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

test('preserves the recipe import panel in the URL', async ({ page }) => {
  await page.goto('/meals?tab=import')
  await expect(
    page.getByPlaceholder('https://example.com/recipe'),
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByPlaceholder('https://example.com/recipe'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL('/meals')
  await expect(page.getByPlaceholder('https://example.com/recipe')).toHaveCount(
    0,
  )
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
