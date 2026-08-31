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
  if (!/^[\w.@-]+$/.test(email)) throw new Error('Unsafe test email')
  return Number(
    sql(
      `update users set is_admin = true where email = '${email}'; select id from users where email = '${email}'`,
    ),
  )
}

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
