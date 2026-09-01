import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

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
