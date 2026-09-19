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

test('@smoke admin merges a custom ingredient and remembers its alias', async ({
  page,
}) => {
  const email = uniqueEmail()
  const suffix = Date.now()
  const sourceName = `Duplicate ${suffix}`
  const targetName = `Canonical ${suffix}`
  const ingredientIds: number[] = []
  await register(page, email)
  const id = userId(email)
  try {
    const custom = await page.request.post('/ingredients', {
      data: { name: sourceName },
    })
    expect(custom.status()).toBe(201)
    const sourceId = (await custom.json()).id
    ingredientIds.push(sourceId)
    expect(
      (
        await page.request.post('/admin/ingredients/merge', {
          data: { sourceId, targetId: 1 },
        })
      ).status(),
    ).toBe(403)
    adminId(email)
    const created = await page.request.post('/admin/ingredients', {
      data: { name: targetName, translations: [] },
    })
    expect(created.status()).toBe(201)
    const targetId = (await created.json()).id
    ingredientIds.push(targetId)
    const meal = await page.request.post('/meals', {
      data: {
        name: `Merge recipe ${suffix}`,
        ingredients: [
          { name: sourceName, ingredientId: sourceId, qty: 100, unit: 'g' },
        ],
      },
    })
    expect(meal.status()).toBe(201)
    const mealId = (await meal.json()).id
    expect(
      (
        await page.request.patch('/profile', {
          data: { pantryIngredientIds: [sourceId, targetId] },
        })
      ).ok(),
    ).toBe(true)

    await page.goto('/admin/ingredients')
    await page
      .getByRole('link', { name: 'Merge ingredients', exact: true })
      .click()
    await page
      .getByRole('textbox', { name: 'Search duplicate ingredients' })
      .fill(sourceName)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`q=Duplicate\\+${suffix}`))
    await page.reload()
    await page
      .getByRole('combobox', { name: 'Duplicate ingredient', exact: true })
      .fill(sourceName)
    await page
      .getByRole('option', {
        name: `${sourceName} (${sourceName}, #${sourceId})`,
        exact: true,
      })
      .click()
    await page
      .getByRole('combobox', { name: 'Merge into', exact: true })
      .fill(targetName)
    await page
      .getByRole('option', {
        name: `${targetName} (${targetName}, #${targetId})`,
        exact: true,
      })
      .click()
    sql(
      `update ingredients set aliases = ARRAY(select 'alias ' || n from generate_series(1, 100) n) where id = ${targetId}`,
    )
    page.once('dialog', (dialog) => dialog.accept())
    await page
      .getByRole('button', { name: 'Merge ingredients', exact: true })
      .click()
    await expect(page.getByRole('alert')).toHaveText(
      'Merged ingredient exceeds catalogue limits. Shorten names or remove aliases or translations before merging.',
    )
    expect(
      sql(
        `select ingredient_id from meal_ingredients where meal_id = ${mealId}`,
      ),
    ).toBe(String(sourceId))
    sql(`update ingredients set aliases = '{}' where id = ${targetId}`)
    page.once('dialog', (dialog) => dialog.dismiss())
    await page
      .getByRole('button', { name: 'Merge ingredients', exact: true })
      .click()
    expect(
      sql(
        `select ingredient_id from meal_ingredients where meal_id = ${mealId}`,
      ),
    ).toBe(String(sourceId))
    page.once('dialog', (dialog) => dialog.accept())
    await page
      .getByRole('button', { name: 'Merge ingredients', exact: true })
      .click()
    await expect(page).toHaveURL(`/admin/ingredients/${targetId}`)
    await expect(
      page.getByRole('region', { name: 'Translation und', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByLabel('General aliases', { exact: true }),
    ).toHaveValue(sourceName.toLowerCase())
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Ingredient saved.')
    await page.reload()
    await expect(
      page.getByLabel('General aliases', { exact: true }),
    ).toHaveValue(sourceName.toLowerCase())
    expect(
      sql(
        `select count(*) from ingredient_translations where ingredient_id = ${targetId} and locale = 'und'`,
      ),
    ).toBe('0')
    expect(
      sql(
        `select ingredient_id || ':' || qty || ':' || unit || ':' || original_name from meal_ingredients where meal_id = ${mealId}`,
      ),
    ).toBe(`${targetId}:100.000:g:${sourceName}`)
    expect(
      sql(
        `select pantry_ingredient_ids::text from user_settings where user_id = ${id}`,
      ),
    ).toBe(`{${targetId}}`)
    const resolved = await page.request.post('/ingredients', {
      data: { name: sourceName },
    })
    expect((await resolved.json()).id).toBe(targetId)
    expect(sql(`select count(*) from ingredients where id = ${sourceId}`)).toBe(
      '0',
    )
    await page.goto('/profile')
    await expect(
      page
        .getByRole('list', { name: 'selected options' })
        .getByText(targetName, { exact: true }),
    ).toBeVisible()
  } finally {
    sql(`delete from users where id = ${id}`)
    if (ingredientIds.length)
      sql(`delete from ingredients where id in (${ingredientIds.join(',')})`)
  }
})

test('@smoke admin configures ingredient translations and aliases', async ({
  page,
}) => {
  const email = uniqueEmail()
  const name = `Catalogue ${Date.now()}`
  let ingredientId: number | undefined
  await register(page, email)
  const id = adminId(email)
  try {
    const personal = await page.request.post('/ingredients', { data: { name } })
    expect(personal.status()).toBe(201)
    ingredientId = (await personal.json()).id
    expect(
      (
        await page.request.put(`/admin/ingredients/${ingredientId}`, {
          data: { name, translations: [] },
        })
      ).status(),
    ).toBe(404)
    await page.goto('/admin/ingredients')
    await expect(page.locator('tbody tr')).toHaveCount(10)
    const pagination = page.getByRole('navigation', { name: 'Pagination' })
    await expect(pagination.getByText(/^Page 1 of \d+$/)).toBeVisible()
    await pagination.getByRole('link', { name: 'Next page' }).click()
    await expect(pagination.locator('[aria-current="page"]')).toHaveText('2')
    await page.getByLabel('Missing English or Czech translation').check()
    await expect(pagination.locator('[aria-current="page"]')).toHaveText('1')
    await expect(page).toHaveURL(/missing=1/)
    await page.reload()
    await expect(
      page.getByLabel('Missing English or Czech translation'),
    ).toBeChecked()
    await page
      .getByRole('link', { name: 'Add ingredient', exact: true })
      .click()
    await page.getByLabel('Original name', { exact: true }).fill(name)
    const translations = page.getByRole('region', { name: /^Translation / })
    await translations
      .nth(0)
      .getByLabel('Translated name', { exact: true })
      .fill(name)
    await translations
      .nth(1)
      .getByLabel('Translated name', { exact: true })
      .fill('Zkušební surovina')
    await translations
      .nth(1)
      .getByLabel('Aliases', { exact: true })
      .fill('Testovací alias\n TESTOVACÍ ALIAS ')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page).toHaveURL(`/admin/ingredients/${ingredientId}`)
    await page.reload()
    const czech = page.getByRole('region', {
      name: 'Translation cs',
      exact: true,
    })
    await expect(czech.getByLabel('Aliases', { exact: true })).toHaveValue(
      'testovací alias',
    )
    await czech
      .getByLabel('Translated name', { exact: true })
      .fill('Upravená surovina')
    await page
      .getByRole('button', { name: 'Add translation', exact: true })
      .click()
    await expect(
      czech.getByLabel('Translated name', { exact: true }),
    ).toHaveValue('Upravená surovina')
    const german = translations.last()
    await german.getByLabel('Language code').fill('de')
    await german.getByLabel('Translated name').fill('Testzutat')
    await german.getByLabel('Aliases', { exact: true }).fill('Testzutaten')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Ingredient saved.')
    await page.goto('/admin/ingredients?q=testzutaten')
    await page.getByLabel('Missing English or Czech translation').check()
    await expect(page.getByText('No ingredients found')).toBeVisible()
    await page.getByLabel('Missing English or Czech translation').uncheck()
    await page.getByRole('link', { name: new RegExp(name) }).click()
    await expect(page.getByLabel('Original name')).toHaveValue(name)
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await page
      .getByRole('combobox', { name: 'Search ingredients' })
      .fill('testzutaten')
    await expect(page.getByRole('option', { name, exact: true })).toBeVisible()
  } finally {
    sql(`delete from users where id = ${id}`)
    if (ingredientId) sql(`delete from ingredients where id = ${ingredientId}`)
  }
})

test('@smoke admin manages users and shared recipes through the UI', async ({
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
    await pageA.setViewportSize({ width: 320, height: 740 })
    expect(
      await pageA.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await pageA.setViewportSize({ width: 1280, height: 740 })
    const userRow = pageA.locator('tr').filter({ hasText: emailB })
    await userRow.getByRole('button', { name: 'Make admin' }).click()
    await expect(
      userRow.getByText('Administrator', { exact: true }),
    ).toBeVisible()
    expect(sql(`select is_admin from users where id = ${ids[1]}`)).toBe('t')

    await userRow.getByRole('button', { name: 'Grant Pro' }).click()
    await expect(userRow.getByText('Pro plan', { exact: true })).toBeVisible()
    expect(sql(`select is_pro from users where id = ${ids[1]}`)).toBe('t')

    const created = await contextA.request.post('/meals', {
      data: { name: recipeName, scope: 'global' },
    })
    expect(created.status()).toBe(201)
    mealId = Number((await created.json()).id)

    await pageA.goto('/admin/recipes')
    await pageA.getByRole('link', { name: 'Imports & approvals' }).click()
    await expect(pageA).toHaveURL('/admin/recipes?tab=imports')
    await expect(
      pageA.getByRole('heading', { name: 'Batch import' }),
    ).toBeVisible()
    await pageA.getByRole('link', { name: 'Shared recipes' }).click()

    const recipeRow = pageA.locator('tr').filter({ hasText: recipeName })
    await expect(recipeRow).toBeVisible()
    for (const width of [1280, 320]) {
      await pageA.setViewportSize({ width, height: 740 })
      expect(
        await pageA.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
      const cellHeights = await recipeRow
        .locator('td')
        .evaluateAll((cells) =>
          cells.map((cell) => cell.getBoundingClientRect().height),
        )
      expect(Math.max(...cellHeights) - Math.min(...cellHeights)).toBeLessThan(
        1,
      )
    }
    await pageA.setViewportSize({ width: 1280, height: 740 })
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
