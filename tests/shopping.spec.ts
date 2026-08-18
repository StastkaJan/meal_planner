import { test, expect } from '@playwright/test'
import { uniqueEmail, register } from './helpers'

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail())
  await page.waitForLoadState('networkidle')
})

test('shopping list counts a batch once when a later slot uses leftovers', async ({
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

  await page.getByRole('button', { name: /Use leftovers from/ }).click()
  await expect(page.getByText('leftovers')).toBeVisible()

  await page.getByRole('link', { name: 'Shopping list' }).click()
  await page.getByLabel('People served').fill('2')
  await page.getByLabel('People served').blur()
  await expect(page.getByText('2 tbsp Honey')).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: ({ text }: ShareData) => {
        sessionStorage.setItem('shared-shopping-list', String(text))
        return Promise.resolve()
      },
    })
  })
  await page.getByRole('button', { name: 'Share list' }).click()
  expect(
    await page.evaluate(() => sessionStorage.getItem('shared-shopping-list')),
  ).toContain('☐ 2 tbsp Honey')

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          sessionStorage.setItem('copied-shopping-list', text)
          return Promise.resolve()
        },
      },
    })
  })
  await page.getByRole('button', { name: 'Copy list' }).click()
  expect(
    await page.evaluate(() => sessionStorage.getItem('copied-shopping-list')),
  ).toContain('☐ 2 tbsp Honey')
  await expect(page.getByText(/Copied.*Google Keep/)).toBeVisible()

  const honey = page.getByRole('checkbox', { name: '4 tbsp Honey' })
  await honey.check()
  await page.reload()
  await expect(
    page.getByRole('checkbox', { name: '4 tbsp Honey' }),
  ).toBeChecked()

  await page.getByLabel('Aisle for Honey').selectOption('Pantry')
  await expect(page.getByRole('heading', { name: 'Pantry' })).toBeVisible()
  const honeyRow = page.locator('li', { hasText: '4 tbsp Honey' })
  await honeyRow.getByRole('button', { name: 'Exclude' }).click()
  await expect(page.getByText('Excluded items (1)')).toBeVisible()
  await page.getByText('Excluded items (1)').click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(
    page.getByRole('checkbox', { name: '4 tbsp Honey' }),
  ).toBeVisible()

  await page.getByLabel('Custom item').fill('Bin bags')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Bin bags')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Bin bags')).toBeVisible()
  await page
    .locator('li', { hasText: 'Bin bags' })
    .getByRole('button', { name: 'Remove' })
    .click()
  await expect(page.getByText('Bin bags')).not.toBeVisible()
})
