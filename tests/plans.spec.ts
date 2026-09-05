import { test, expect } from '@playwright/test'
import { grantPro, uniqueEmail, register } from './helpers'

let email: string

test.beforeEach(async ({ page }) => {
  email = uniqueEmail()
  await register(page, email)
  await page.waitForLoadState('networkidle')
})

test('@smoke create a plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Create plan' }).click()
  await expect(page.getByRole('link', { name: 'Shopping list' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Create plan' }),
  ).not.toBeVisible()
  await page.getByText('Plan settings').click()
  await expect(page.getByText('Cuisine preferences')).toBeVisible()
  await expect(page.getByText('Dietary restrictions')).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: 'Favourites only' }),
  ).toBeDisabled()
  await expect(
    page
      .locator('details.settings')
      .getByRole('checkbox', { name: 'My recipes only' }),
  ).toBeVisible()
  await expect(
    page
      .locator('.foot-actions')
      .getByRole('checkbox', { name: 'My recipes only' }),
  ).toHaveCount(0)
  await expect(page.getByText('Repeat pattern')).toBeVisible()
  await expect(page).toHaveTitle('Planner · Papu Plan')
})

test('prefill an extra item from a common preset', async ({ page }) => {
  await page.getByRole('button', { name: 'Create plan' }).click()
  await page.getByRole('button', { name: '+ extra' }).first().click()
  await page.getByRole('button', { name: 'Pizza', exact: true }).click()

  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Pizza')
  await expect(page.getByLabel('Calories', { exact: true })).toHaveValue('800')
  await expect(page.getByLabel('Protein g', { exact: true })).toHaveValue('32')
  await expect(page.getByLabel('Carbs g', { exact: true })).toHaveValue('96')
  await expect(page.getByLabel('Fat g', { exact: true })).toHaveValue('32')
  await expect(page.getByLabel('Fibre g', { exact: true })).toHaveValue('6')
  await expect(page.getByLabel('Sugars g', { exact: true })).toHaveValue('8')
  await expect(page.getByLabel('Saturated fat g', { exact: true })).toHaveValue(
    '14',
  )
  await expect(page.getByLabel('Salt g', { exact: true })).toHaveValue('3.2')

  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(
    page.locator('.bonus-item').filter({ hasText: 'Pizza' }),
  ).toContainText('800')
})

test('configure enabled and custom meal slots for auto-compose', async ({
  page,
}) => {
  grantPro(email)
  await page.reload()
  await page.getByRole('button', { name: 'Create plan' }).click()
  await page.getByText('Plan settings').click()

  for (const name of ['morning snack', 'afternoon snack']) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          /\/plans\/\d+$/.test(new URL(response.url()).pathname) &&
          response.request().method() === 'PATCH',
      ),
      page.getByRole('checkbox', { name }).uncheck(),
    ])
  }

  await page.getByLabel('Custom slot name').fill('Second breakfast')
  await Promise.all([
    page.waitForResponse(
      (response) =>
        /\/plans\/\d+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'PATCH',
    ),
    page.getByRole('button', { name: 'Add slot' }).click(),
  ])

  const labels = page.locator('tbody .row-label')
  await expect(labels.filter({ hasText: 'morning snack' })).toHaveCount(0)
  await expect(labels.filter({ hasText: 'afternoon snack' })).toHaveCount(0)
  await expect(labels.filter({ hasText: 'second breakfast' })).toHaveCount(1)

  await page.getByRole('button', { name: 'Auto-compose' }).click()
  const customRow = page.locator('tbody tr').filter({
    has: page.locator('.row-label', { hasText: 'second breakfast' }),
  })
  await expect(customRow.locator('.name').first()).toBeVisible()
})

test('delete a plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Create plan' }).click()

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Create plan' })).toBeVisible()
})

test('@smoke reroll a single meal, clear a day, and clear all plan weeks', async ({
  page,
}) => {
  grantPro(email)
  await page.reload()
  await page.getByRole('button', { name: 'Create plan' }).click()
  await expect(page.getByRole('link', { name: 'Shopping list' })).toBeVisible()
  const planId = new URL(page.url()).searchParams.get('plan')!
  const week = new URL(page.url()).searchParams.get('week')!
  const nextDate = (days: number) => {
    const date = new Date(week)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }
  const base = `/plans/${planId}`
  const mealResponse = await page.request.get('/meals')
  const meals = await mealResponse.json()
  const meal = meals.find(
    (item: { allowedSlots: string[] }) =>
      !item.allowedSlots.length || item.allowedSlots.includes('lunch'),
  )
  expect(meal).toBeTruthy()
  expect(
    (
      await page.request.put(`${base}/slot-repeats`, {
        data: {
          mealType: 'lunch',
          groupBreaks: [false, true, true, true, true, true],
        },
      })
    ).ok(),
  ).toBe(true)
  expect(
    (
      await page.request.put(`${base}/slots`, {
        data: { date: week, mealType: 'lunch', mealId: meal.id },
      })
    ).ok(),
  ).toBe(true)
  expect(
    (
      await page.request.patch(`${base}/slots`, {
        data: {
          date: nextDate(1),
          mealType: 'lunch',
          source: { date: week, mealType: 'lunch' },
        },
      })
    ).ok(),
  ).toBe(true)
  expect(
    (
      await page.request.post(`${base}/bonus`, {
        data: { date: week, name: 'Test extra', calories: 100 },
      })
    ).ok(),
  ).toBe(true)
  expect(
    (
      await page.request.put(`${base}/slots`, {
        data: { date: nextDate(7), mealType: 'lunch', mealId: meal.id },
      })
    ).ok(),
  ).toBe(true)
  await page.reload()
  const cells = page
    .locator('tbody tr')
    .filter({
      has: page.locator('.row-label', { hasText: 'lunch' }),
    })
    .locator('.slot-cell')
  const before = await cells
    .nth(0)
    .getByRole('link', { name: 'Show recipe' })
    .getAttribute('href')
  await cells
    .nth(0)
    .getByRole('button', { name: 'Try a different recipe' })
    .click()
  await expect(
    cells.nth(0).getByRole('link', { name: 'Show recipe' }),
  ).not.toHaveAttribute('href', before!)
  await expect(
    cells.nth(1).getByRole('link', { name: 'Show recipe' }),
  ).toHaveAttribute('href', before!)
  await expect(cells.nth(1).locator('.leftover-label')).toHaveCount(0)

  page.once('dialog', (dialog) => dialog.dismiss())
  await page
    .getByRole('button', { name: 'Clear day', exact: true })
    .first()
    .click()
  await expect(cells.nth(0).locator('.name')).toHaveCount(1)
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Clear day', exact: true })
    .first()
    .click()
  await expect(cells.nth(0).locator('.name')).toHaveCount(0)
  await expect(cells.nth(1).locator('.name')).toHaveCount(1)
  await expect(page.locator('.bonus-item')).toHaveCount(0)
  await page.reload()
  await expect(cells.nth(0).locator('.name')).toHaveCount(0)
  await expect(cells.nth(1).locator('.name')).toHaveCount(1)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Clear plan', exact: true }).click()
  await expect(page.locator('.cal .name')).toHaveCount(0)
  const nextWeek = await (
    await page.request.get(`${base}?week=${nextDate(7)}`)
  ).json()
  expect(nextWeek.slots).toEqual([])
  expect(nextWeek.bonus).toEqual([])
  expect(nextWeek.slotRepeats).toHaveLength(1)
  await expect(page.getByRole('link', { name: 'Shopping list' })).toBeVisible()
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
  await expect(
    lunchCells.nth(0).getByRole('button', { name: 'Edit meal assignment' }),
  ).toBeVisible()
  await expect(
    lunchCells.nth(0).getByRole('link', { name: 'Show recipe' }),
  ).toHaveAttribute('href', /\/meals\/\d+/)
  const heights = await lunchCells.evaluateAll((cells) =>
    cells.map((cell) => [
      cell.clientHeight,
      cell.querySelector('.cell')!.getBoundingClientRect().height,
    ]),
  )
  expect(heights.every(([cell, meal]) => Math.abs(cell - meal) < 1)).toBe(true)
  await lunchCells.nth(0).getByRole('button', { name: 'Remove meal' }).click()
  await expect(lunchCells.nth(0)).not.toContainText('Grilled Chicken')
  await expect(lunchCells.nth(1)).not.toContainText('Grilled Chicken')
})
