import { test, expect } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('@smoke coffee and saved extras are searchable, reusable, and private', async ({
  page,
  browser,
}) => {
  await register(page, uniqueEmail())
  await page.getByRole('button', { name: 'Create plan' }).click()
  const addExtra = page.getByRole('button', { name: '+ extra', exact: true })
  const dialog = page.getByRole('dialog', {
    name: 'Add off-plan item',
    exact: true,
  })
  await addExtra.first().click()
  await dialog.getByRole('button', { name: 'Coffee', exact: true }).click()
  await expect(
    dialog.getByRole('spinbutton', { name: 'Calories', exact: true }),
  ).toHaveValue('2')
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.locator('.bonus-item').filter({ hasText: 'Coffee' }),
  ).toBeVisible()

  await addExtra.first().click()
  await dialog.getByRole('button', { name: 'Custom extra' }).click()
  await dialog.getByLabel('Name', { exact: true }).fill('My latte')
  await dialog
    .getByRole('spinbutton', { name: 'Calories', exact: true })
    .fill('120')
  await dialog.getByLabel('Save for later').check()
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  for (let i = 0; i < 20; i++) {
    expect(
      (
        await page.request.post('/extras', {
          data: { name: `Saved snack ${i}`, calories: 100 },
        })
      ).status(),
    ).toBe(201)
  }
  await page.reload()
  await addExtra.nth(1).click()
  expect(
    (await dialog.locator('.extra-list').boundingBox())!.height,
  ).toBeLessThanOrEqual(321)
  await dialog.getByRole('searchbox', { name: 'Search extras' }).fill('latte')
  await expect(dialog.locator('.extra-choice')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'My latte', exact: true }).click()
  await expect(
    dialog.getByRole('spinbutton', { name: 'Calories', exact: true }),
  ).toHaveValue('120')
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(
    page.locator('.bonus-item').filter({ hasText: 'My latte' }),
  ).toHaveCount(2)

  const exported = await (await page.request.get('/profile/export')).json()
  const saved = exported.savedExtras.find(
    (extra: { name: string }) => extra.name === 'My latte',
  )
  expect(saved).toMatchObject({ name: 'My latte', calories: 120 })
  const other = await browser.newContext({ baseURL: 'http://localhost:3000' })
  try {
    expect((await other.request.delete(`/extras/${saved.id}`)).status()).toBe(
      401,
    )
    const otherPage = await other.newPage()
    await register(otherPage, uniqueEmail())
    expect((await other.request.delete(`/extras/${saved.id}`)).status()).toBe(
      404,
    )
    expect(
      (await (await other.request.get('/profile/export')).json()).savedExtras,
    ).toEqual([])
  } finally {
    await other.close()
  }

  await addExtra.first().click()
  await dialog.getByRole('searchbox', { name: 'Search extras' }).fill('latte')
  await dialog
    .getByRole('button', { name: 'Delete saved extra My latte', exact: true })
    .click()
  await expect(dialog.getByText('No extras found')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload()
  await expect(
    page.locator('.bonus-item').filter({ hasText: 'My latte' }),
  ).toHaveCount(2)
})
