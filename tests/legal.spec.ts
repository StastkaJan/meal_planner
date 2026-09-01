import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('legal documents are public UTF-8 pages', async ({ page }) => {
  await page.goto('/legal/terms')
  await expect(
    page.getByRole('heading', {
      name: 'Podmínky používání služby Papu Plan',
      level: 1,
    }),
  ).toBeVisible()

  await page
    .getByRole('link', {
      name: 'Informace o zpracování osobních údajů',
    })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Informace o zpracování osobních údajů',
      level: 1,
    }),
  ).toBeVisible()
})

test('@smoke legacy users acknowledge current legal documents once', async ({
  page,
}) => {
  const email = uniqueEmail()
  await register(page, email)

  execFileSync('docker', [
    'compose',
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    'mealplan',
    '-d',
    'mealplan',
    '-c',
    `DELETE FROM legal_document_events WHERE user_id = (SELECT id FROM users WHERE email = '${email}')`,
  ])

  await page.reload()
  const notices = page.getByRole('region', { name: 'Legal updates' })
  await expect(notices).toBeVisible()
  await notices.getByRole('button', { name: 'Accept' }).click()
  await notices.getByRole('button', { name: 'Acknowledge' }).click()
  await expect(notices).not.toBeVisible()

  await page.reload()
  await expect(notices).not.toBeVisible()
})
