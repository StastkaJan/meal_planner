import { test, expect } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('@smoke picker preserves newer typing when an earlier search completes', async ({
  page,
}) => {
  await register(page, uniqueEmail())
  await page.getByRole('button', { name: 'Create plan' }).click()
  await page.getByTitle('Click to assign meal').first().click()
  const search = page.getByRole('dialog').getByRole('searchbox')
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'))

  let releaseSearch!: () => void
  const searchHeld = new Promise<void>((resolve) => {
    releaseSearch = resolve
  })
  await page.route('**/__data.json?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('pickQuery') === 'sou')
      await searchHeld
    await route.continue()
  })

  const firstRequest = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get('pickQuery') === 'sou',
  )
  await search.fill('sou')
  await page.clock.runFor(250)
  await firstRequest
  await search.fill('soup')
  releaseSearch()
  await expect(page).toHaveURL(/pickQuery=sou(?:&|$)/)
  await expect(search).toHaveValue('soup')
  await page.clock.runFor(250)
  await expect(page).toHaveURL(/pickQuery=soup(?:&|$)/)
  await page.reload()
  await expect(page.getByRole('dialog').getByRole('searchbox')).toHaveValue(
    'soup',
  )
})

for (const closeWith of ['cancel', 'escape', 'select'] as const) {
  test(`@smoke picker cancels pending search on ${closeWith}`, async ({
    page,
  }) => {
    await register(page, uniqueEmail())
    await page.getByRole('button', { name: 'Create plan' }).click()
    await page.getByTitle('Click to assign meal').first().click()
    const dialog = page.getByRole('dialog')
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'))

    let releaseClose!: () => void
    const closeHeld = new Promise<void>((resolve) => {
      releaseClose = resolve
    })
    await page.route('**/__data.json?**', async (route) => {
      if (!new URL(route.request().url()).searchParams.has('pickDate'))
        await closeHeld
      await route.continue()
    })
    await page.route('**/plans/*/slots', async (route) => {
      await closeHeld
      await route.continue()
    })
    const searches: string[] = []
    page.on('request', (request) => {
      const query = new URL(request.url()).searchParams.get('pickQuery')
      if (query) searches.push(query)
    })
    const closingRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())
      return closeWith === 'select'
        ? url.pathname.endsWith('/slots') && request.method() === 'PUT'
        : url.pathname.endsWith('/__data.json') &&
            !url.searchParams.has('pickDate')
    })
    await dialog.getByRole('searchbox').fill('pending search')
    if (closeWith === 'cancel')
      await dialog.getByRole('button', { name: 'Cancel' }).click()
    else if (closeWith === 'escape') {
      // A focused search input consumes Escape to clear its text first.
      await dialog.getByRole('button', { name: 'Cancel' }).focus()
      await page.keyboard.press('Escape')
    } else await dialog.locator('.list .item').first().click()
    await closingRequest
    if (closeWith === 'select') {
      await expect(
        dialog.getByRole('button', { name: 'Cancel' }),
      ).toBeDisabled()
      await expect(dialog.locator('.list .item').first()).toBeDisabled()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()
      await expect(page).toHaveURL(/pickDate=/)
      await page.goBack()
      await expect(dialog).toBeVisible()
      await expect(page).toHaveURL(/pickDate=/)
    }
    await page.clock.runFor(300)
    expect(searches).toEqual([])
    releaseClose()
    await expect(dialog).not.toBeVisible()
    await expect(page).not.toHaveURL(/pickDate=/)
  })
}

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
