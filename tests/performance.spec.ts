import { test, expect } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('@smoke picker pagination, search, and reload preserve the selected slot', async ({
  page,
}) => {
  await register(page, uniqueEmail())
  await page.getByRole('button', { name: 'Create plan' }).click()
  for (let i = 0; i < 35; i++) {
    const response = await page.request.post('/meals', {
      data: {
        name: `Performance recipe ${String(i).padStart(2, '0')}`,
        scope: 'personal',
        allowedSlots: ['breakfast'],
      },
    })
    expect(response.ok()).toBe(true)
  }
  await page.getByTitle('Click to assign meal').first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Search meals…').fill('Performance recipe')
  await expect(page).toHaveURL(/pickQuery=Performance/)
  await expect(dialog.locator('.list .item')).toHaveCount(30)
  await dialog.getByRole('button', { name: 'Next page' }).click()
  await expect(dialog.locator('.list .item')).toHaveCount(5)
  await page.reload()
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.list .item')).toHaveCount(5)
  await dialog
    .getByRole('button', { name: 'Performance recipe 34', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.slot-cell').first()).toContainText(
    'Performance recipe 34',
  )
  expect(new URL(page.url()).searchParams.has('pickDate')).toBe(false)
  await page.getByRole('button', { name: 'Next week', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
