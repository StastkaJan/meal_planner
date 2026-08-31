import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

function sql(statement: string) {
  return execFileSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'mealplan',
      '-d',
      'mealplan',
      '-Atq',
      '-c',
      statement,
    ],
    { encoding: 'utf8' },
  ).trim()
}

function adminId(email: string) {
  const id = userId(email)
  sql(`update users set is_admin = true where id = ${id}`)
  return id
}

function userId(email: string) {
  if (!/^[\w.@-]+$/.test(email)) throw new Error('Unsafe test email')
  return Number(sql(`select id from users where email = '${email}'`))
}

test('admin manages users and shared recipes through the UI', async ({
  browser,
}) => {
  const emailA = uniqueEmail()
  const emailB = uniqueEmail()
  const recipeName = `Admin recipe ${Date.now()}`
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()
  let ids: number[] = []
  let mealId: number | null = null

  try {
    await Promise.all([register(pageA, emailA), register(pageB, emailB)])
    ids = [adminId(emailA), userId(emailB)]

    await pageA.goto('/admin/users')
    const userRow = pageA.locator('tr').filter({ hasText: emailB })
    await userRow.getByRole('button', { name: 'Make admin' }).click()
    await expect(
      userRow.getByText('Administrator', { exact: true }),
    ).toBeVisible()
    expect(sql(`select is_admin from users where id = ${ids[1]}`)).toBe('t')

    const created = await contextA.request.post('/meals', {
      data: { name: recipeName, scope: 'global' },
    })
    expect(created.status()).toBe(201)
    mealId = Number((await created.json()).id)

    await pageA.goto('/admin/recipes')
    const recipeRow = pageA.locator('tr').filter({ hasText: recipeName })
    await expect(recipeRow).toBeVisible()
    pageA.once('dialog', (dialog) => dialog.accept())
    await recipeRow.getByRole('button', { name: 'Archive' }).click()
    await expect(recipeRow).toHaveCount(0)
    expect(
      sql(`select archived_at is not null from meals where id = ${mealId}`),
    ).toBe('t')
  } finally {
    if (mealId !== null) sql(`delete from meals where id = ${mealId}`)
    if (ids.length) sql(`delete from users where id in (${ids.join(',')})`)
    await Promise.all([contextA.close(), contextB.close()])
  }
})

test('concurrent reciprocal admin revocations preserve an administrator', async ({
  browser,
}) => {
  const emailA = uniqueEmail()
  const emailB = uniqueEmail()
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()
  let ids: number[] = []

  try {
    await Promise.all([register(pageA, emailA), register(pageB, emailB)])
    ids = [adminId(emailA), adminId(emailB)]

    const responses = await Promise.all([
      contextA.request.patch(`/admin/users/${ids[1]}`, {
        data: { isAdmin: false },
      }),
      contextB.request.patch(`/admin/users/${ids[0]}`, {
        data: { isAdmin: false },
      }),
    ])

    expect(responses.map((response) => response.status()).sort()).toEqual([
      200, 403,
    ])
    expect(
      Number(
        sql(
          `select count(*) from users where is_admin and id in (${ids.join(',')})`,
        ),
      ),
    ).toBe(1)
  } finally {
    if (ids.length) sql(`delete from users where id in (${ids.join(',')})`)
    await Promise.all([contextA.close(), contextB.close()])
  }
})
