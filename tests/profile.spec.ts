import { test, expect } from '@playwright/test'
import { grantPro, register, uniqueEmail } from './helpers'

let email: string

test.beforeEach(async ({ page }) => {
  email = uniqueEmail()
  await register(page, email)
  await page.goto('/profile')
})

test('@smoke pantry multiselect searches aliases and reuses custom ingredients', async ({
  page,
}) => {
  const search = page.getByRole('combobox', { name: 'Search ingredients' })
  await search.fill('rajčata')
  const tomato = page.getByRole('option', { name: 'Tomato', exact: true })
  await expect(tomato).toHaveCount(1)
  await tomato.click()
  await search.fill('My custom seasoning')
  await page
    .getByRole('option', { name: 'Add custom ingredient: My custom seasoning' })
    .click()
  await expect(
    page.getByRole('button', {
      name: 'Remove ingredient: My custom seasoning',
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save pantry staples' }).click()
  await expect(page.getByText('Pantry staples saved.')).toBeVisible()
  await page.reload()
  const chips = page.locator('.ingredient-picker ul.selected > li')
  await expect(chips).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Remove ingredient: My custom seasoning' })
    .click()
  await page.getByRole('button', { name: 'Save pantry staples' }).click()
  await expect(page.getByText('Pantry staples saved.')).toBeVisible()
  await page.reload()
  await expect(chips).toHaveCount(1)
  await search.fill('My custom seasoning')
  await page
    .getByRole('option', { name: 'My custom seasoning', exact: true })
    .click()
  await expect(chips).toHaveCount(2)
})

test('@smoke saves all nutrient goals and restores defaults when cleared', async ({
  page,
}) => {
  const fields = [
    ['Fibre (g)', '25.5'],
    ['Sugars (g)', '60'],
    ['Saturates (g)', '15'],
    ['Salt (g)', '5.5'],
  ] as const
  for (const [label, value] of fields)
    await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Save targets' }).click()
  await expect(page.getByText('Targets saved.')).toBeVisible()
  await page.reload()
  for (const [label, value] of fields)
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value)
  await page.goto('/')
  await page.getByRole('button', { name: 'Create plan' }).click()
  const nutrition = page.locator('.nutrition-cell').first()
  for (const [label, value] of fields) {
    const name = label.replace(' (g)', '')
    await nutrition.getByRole('button', { name, exact: true }).click()
    await expect(
      nutrition.getByRole('meter', { name, exact: true }),
    ).toHaveAttribute('aria-valuemax', value)
    await nutrition.getByRole('button', { name: 'Close', exact: true }).click()
  }
  await page.goto('/profile')
  await page.getByLabel('Salt (g)', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Save targets' }).click()
  await expect(page.getByText('Targets saved.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Salt (g)', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Fibre (g)', { exact: true })).toHaveValue(
    '25.5',
  )
  await page.goto('/')
  await nutrition.getByRole('button', { name: 'Salt', exact: true }).click()
  await expect(
    nutrition.getByRole('meter', { name: 'Salt', exact: true }),
  ).toHaveAttribute('aria-valuemax', '6')
})

test('profile controls stay visible and save settings', async ({ page }) => {
  const calories = page.getByLabel('Calories (kcal)')
  await expect(calories).toBeVisible()
  await expect(page.getByRole('link', { name: 'Preferences' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('link', { name: 'Security' }).click()
  await expect(page.getByLabel('Current password')).toBeVisible()
  await expect(calories).not.toBeVisible()
  await page.getByRole('link', { name: 'Preferences' }).click()

  await page.goto('/')
  await page.getByRole('button', { name: 'Create plan' }).click()
  await page.goto('/profile')

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/profile') &&
        response.request().method() === 'PATCH',
    ),
    page.getByText('Italian', { exact: true }).click(),
  ])

  await calories.fill('2100')
  await page.getByRole('button', { name: 'Save targets' }).click()
  await expect(page.getByText('Targets saved.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Italian' })).toBeChecked()
  await expect(calories).toHaveValue('2100')

  grantPro(email)
  await page.goto('/')
  await page.getByText('Plan settings').click()
  await page.getByRole('button', { name: 'Auto-compose' }).click()
  await expect(page.locator('button.cell').first()).toContainText(
    'Pasta Bolognese',
  )
})

test('exports private account data and permanently deletes the account', async ({
  page,
}) => {
  const email = (await page.locator('.profile-page .email').textContent())!
  const password = 'password1'
  await page.request.post('/meals', {
    data: {
      name: 'My export recipe',
      ingredients: [{ name: 'Rice', qty: 1, unit: 'cup' }],
    },
  })
  await page.request.post('/plans', { data: {} })

  await page.getByRole('link', { name: 'Data & privacy' }).click()
  await expect(page).toHaveURL(/\/profile\?tab=data$/)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download my data' }).click()
  const stream = await (await downloadPromise).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const exported = JSON.parse(Buffer.concat(chunks).toString())

  expect(exported.account.email).toBe(email)
  expect(exported.recipes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'My export recipe' }),
    ]),
  )
  expect(
    exported.recipes.some(
      (recipe: { name: string }) => recipe.name === 'Pasta Bolognese',
    ),
  ).toBe(false)
  expect(exported.plans).toHaveLength(1)
  expect(JSON.stringify(exported)).not.toContain('passwordHash')
  expect(JSON.stringify(exported)).not.toContain('session')

  await page.getByLabel('Password', { exact: true }).fill('wrong-password')
  await page.getByLabel(`Type ${email} to confirm`).fill(email)
  await page
    .getByRole('button', { name: 'Delete my account permanently' })
    .click()
  await expect(
    page.getByText('Password or confirmation is incorrect'),
  ).toBeVisible()

  await page.getByLabel('Password', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Delete my account permanently' })
    .click()
  await page.waitForURL('/auth/login')

  const login = await page.request.post('/auth/login', {
    form: { email, password },
    headers: { origin: 'http://localhost:3000' },
    maxRedirects: 0,
  })
  expect(await login.text()).toContain('Invalid email or password')
})
