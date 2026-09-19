import { test, expect } from '@playwright/test'
import { grantPro, register, uniqueEmail } from './helpers'

let nativeDialogs: string[]
let email: string

test.beforeEach(async ({ page }) => {
  nativeDialogs = []
  page.on('dialog', async (dialog) => {
    nativeDialogs.push(dialog.message())
    await dialog.dismiss()
  })
  email = uniqueEmail()
  await register(page, email)
  await page.getByRole('button', { name: 'Create plan' }).click()
})

test.afterEach(() => {
  expect(nativeDialogs).toEqual([])
})

test('@smoke custom confirmation supports cancel, Escape, focus and server errors', async ({
  page,
}) => {
  let clears = 0
  await page.route('**/plans/*/clear', async (route) => {
    clears++
    await route.fulfill({ status: 503, json: { message: 'Request failed' } })
  })
  const trigger = page.getByRole('button', { name: 'Clear week', exact: true })
  const popup = page.getByRole('alertdialog')
  const cancel = popup.getByRole('button', { name: 'Cancel', exact: true })
  const confirm = popup.getByRole('button', { name: 'Confirm', exact: true })

  await trigger.click()
  await expect(popup).toHaveAccessibleName(
    'Clear all meals and extras for this week? Plan settings will be kept.',
  )
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(cancel).toBeFocused()
  await cancel.click()
  await expect(popup).not.toBeVisible()
  await expect(trigger).toBeFocused()
  expect(clears).toBe(0)

  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(popup).not.toBeVisible()
  await expect(trigger).toBeFocused()
  expect(clears).toBe(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await trigger.click()
  const bounds = (await popup.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390)
  await confirm.click()
  await expect(popup).toHaveAccessibleName('Request failed')
  await expect(popup.getByRole('button', { name: 'Close' })).toBeFocused()
  await expect(cancel).toHaveCount(0)
  await popup.getByRole('button', { name: 'Close' }).click()
  await expect(popup).not.toBeVisible()
  await expect(trigger).toBeEnabled()
  expect(clears).toBe(1)
})

test('@smoke custom alert appears over the meal picker and allows retry', async ({
  page,
}) => {
  const created = await page.request.post('/meals', {
    data: { name: 'Popup retry recipe' },
  })
  expect(created.ok()).toBe(true)
  await page.getByTitle('Click to assign meal').first().click()
  const picker = page.getByRole('dialog')
  await picker.getByRole('searchbox').fill('Popup retry recipe')
  await expect(page).toHaveURL(/pickQuery=Popup/)
  await page.route('**/plans/*/slots', (route) => route.abort(), { times: 1 })
  await picker.getByRole('button', { name: 'Popup retry recipe' }).click()
  const popup = page.getByRole('alertdialog', {
    name: 'Something went wrong.',
  })
  await expect(popup).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popup).not.toBeVisible()
  await expect(picker).toBeVisible()
  await picker.getByRole('button', { name: 'Popup retry recipe' }).click()
  await expect(picker).not.toBeVisible()
  await expect(page.locator('.cal .name').first()).toHaveText(
    'Popup retry recipe',
  )
})

test('@smoke copy-week confirmation and informational alerts use custom popups', async ({
  page,
}) => {
  grantPro(email)
  await page.reload()
  let copies = 0
  await page.route('**/plans/*/copy-week', async (route) => {
    copies++
    await route.fulfill({ json: {} })
  })
  const copy = page.getByRole('button', { name: 'Copy from last week' })
  const popup = page.getByRole('alertdialog')
  await copy.click()
  await expect(popup).toHaveAccessibleName(
    'Copy last week into this week? Existing slots will be overwritten.',
  )
  await popup.getByRole('button', { name: 'Cancel' }).click()
  expect(copies).toBe(0)
  await copy.click()
  await popup.getByRole('button', { name: 'Confirm' }).click()
  await expect.poll(() => copies).toBe(1)

  await page.route('**/plans/*/autocompose', (route) =>
    route.fulfill({ json: { filled: 0 } }),
  )
  await page.getByRole('button', { name: 'Auto-compose', exact: true }).click()
  await expect(popup).toHaveAccessibleName('No empty slots to fill.')
  await popup.getByRole('button', { name: 'Close' }).click()
  await expect(popup).not.toBeVisible()
})

test('@smoke navigating back dismisses confirmation without deleting the recipe', async ({
  page,
}) => {
  const created = await page.request.post('/meals', {
    data: { name: 'Keep on navigation' },
  })
  expect(created.ok()).toBe(true)
  await page.goto('/meals')
  await page
    .getByRole('link', { name: 'Keep on navigation', exact: true })
    .click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/meals')
  await expect(page.getByRole('alertdialog')).not.toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Keep on navigation', exact: true }),
  ).toBeVisible()
})
