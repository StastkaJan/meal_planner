import { test, expect } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.goto('/meals')
  await page.waitForLoadState('networkidle')
})

test('meal name links to detail page', async ({ page }) => {
  const name = `Detail-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await Promise.all([
    page.waitForURL(/\/meals\/\d+$/),
    page.getByRole('link', { name, exact: true }).click(),
  ])
  await expect(page.locator('h1')).toHaveText(name)
  await expect(page).not.toHaveURL('/meals')
})

test('edit meal from detail page', async ({ page }) => {
  const name = `Edit-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await Promise.all([
    page.waitForURL(/\/meals\/\d+$/),
    page.getByRole('link', { name, exact: true }).click(),
  ])

  await page.goto(`${page.url()}?edit=1`)
  const updated = `Updated-${Date.now()}`
  await page.locator('input[type="text"]').first().fill(updated)
  await page.getByLabel('Fibre (g)').fill('4.5')
  await page.getByLabel('Sugars (g)').fill('8')
  await page.getByLabel('Saturated fat (g)').fill('2.5')
  await page.getByLabel('Salt (g)').fill('1')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/meals\/\d+$/)
  await expect(page.locator('h1')).toHaveText(updated)
  await expect(page.getByText('4.5g fibre')).toBeVisible()
  await expect(page.getByText('8.0g sugars')).toBeVisible()
  await expect(page.getByText('2.5g saturated fat')).toBeVisible()
  await expect(page.getByText('1.0g salt')).toBeVisible()
})

test('delete meal from detail page', async ({ page }) => {
  const name = `Del-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await Promise.all([
    page.waitForURL(/\/meals\/\d+$/),
    page.getByRole('link', { name, exact: true }).click(),
  ])

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page).toHaveURL('/meals')
})

test('warns when an ingredient cannot be scaled', async ({ page }) => {
  const name = `Unscaled-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await page.getByRole('link', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByPlaceholder('Ingredient').fill('Salt to taste')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()

  await expect(page.getByRole('note')).toContainText('cannot be scaled')
})

test('allows an ingredient quantity without a unit', async ({ page }) => {
  const name = `Unitless-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await page.getByRole('link', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByPlaceholder('Ingredient').fill('Eggs')
  await page.getByPlaceholder('Qty').fill('2')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('listitem')).toHaveText('2 Eggs')
})

test('does not silently discard a partial ingredient row', async ({ page }) => {
  test.fail(true, 'Known gap: partial ingredient rows are silently discarded')

  const response = await page.request.post('/meals', {
    data: { name: `Partial-${Date.now()}` },
  })
  const meal = await response.json()
  await page.goto(`/meals/${meal.id}?edit=1`)
  await page.getByPlaceholder('Qty').fill('2')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.locator('.edit-form')).toBeVisible()
})

test('scales ingredient quantities with servings', async ({ page }) => {
  const name = `Scale-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await page.getByRole('link', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Servings').fill('2')
  await page.getByPlaceholder('Ingredient').fill('Flour')
  await page.getByPlaceholder('Qty').fill('1')
  await page.locator('.ingredient-row select').selectOption('cup')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('listitem')).toHaveText('1 cup Flour')
  await page.getByRole('button', { name: 'More servings' }).click()
  await expect(page.getByRole('listitem')).toHaveText('1.5 cup Flour')
})

test('translates recipe ingredient names', async ({ page }) => {
  const name = `Translate-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await page.getByRole('link', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByPlaceholder('Ingredient').fill('Carrot')
  await page.getByLabel('Instructions').fill('Chop the carrot.')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()

  await page.getByRole('button', { name: 'Translate' }).click()
  await page.getByLabel('Carrot').fill('Mrkev')
  await page.getByRole('button', { name: 'Save translation' }).click()

  const recipeUrl = page.url()
  await page.goto('/profile')
  await page.locator('select[name="locale"]').selectOption('cs')
  await page.getByRole('button', { name: 'Save language' }).click()
  await page.waitForLoadState('networkidle')
  await page.goto(recipeUrl)
  await expect(page.getByRole('listitem')).toHaveText('Mrkev')
})

test('cooking mode scales ingredients, presents steps, and starts timers', async ({
  page,
}) => {
  const name = `Cook-${Date.now()}`
  await page.getByRole('button', { name: '+ Add meal' }).click()
  await page.getByPlaceholder('Meal name').fill(name)
  await page
    .locator('.create-form')
    .getByRole('button', { name: 'Save' })
    .click()
  await page.getByRole('link', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Servings').fill('2')
  await page.getByPlaceholder('Ingredient').fill('Flour')
  await page.getByPlaceholder('Qty').fill('1')
  await page.locator('.ingredient-row select').selectOption('cup')
  await page
    .getByLabel('Instructions')
    .fill('Heat the oven. Bake until golden.')
  await page.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('link', { name: 'Start cooking' }).click()
  await expect(page).toHaveURL(/\?cook=1$/)
  await expect(page.getByText('Heat the oven.')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveText('1 cup Flour')

  await page.getByRole('button', { name: 'More cooking servings' }).click()
  await expect(page.getByRole('listitem')).toHaveText('1.5 cup Flour')
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(page.getByText('Bake until golden.')).toBeVisible()

  await page.getByLabel('Minutes').fill('0.1')
  await page.getByRole('button', { name: 'Start timer' }).click()
  await expect(page.locator('.timer strong')).toHaveText(/0:\d{2}/)
  await expect(page.getByText(/Screen awake|Wake lock/)).toBeVisible()
})
