import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('@smoke visitors discover the product and can create an account', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Less deciding.More enjoying.',
  )
  const secondary = page.getByRole('link', { name: 'See how it works' })
  const background = await secondary.evaluate(
    (link) => getComputedStyle(link).backgroundColor,
  )
  await secondary.hover()
  await expect
    .poll(() =>
      secondary.evaluate((link) => getComputedStyle(link).backgroundColor),
    )
    .not.toBe(background)
  await secondary.click()
  await expect(page).toHaveURL('/#how-it-works')
  await expect(
    page.getByRole('heading', { name: 'A simpler rhythm for your week.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Our vision', exact: true }).click()
  await expect(page).toHaveURL('/#vision')
  await expect(
    page.getByText('We believe eating well should fit into your life.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Create your free account' }).click()
  await expect(page).toHaveURL('/auth/register')
})

test('Czech visitors see a localized landing page on mobile', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'locale', value: 'cs', url: 'http://localhost:3000' },
  ])
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Méně rozhodování.Více radosti.',
  )
  await expect(
    page.getByRole('link', { name: 'Plánovat zdarma' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('link', { name: 'Přihlásit se', exact: true }).click()
  await expect(page).toHaveURL('/auth/login')
})

test('signed-in users keep their planner and can return from the introduction', async ({
  page,
}) => {
  await register(page, uniqueEmail())
  await expect(page).toHaveURL('/planner')
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
    'Less deciding.More enjoying.',
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Less deciding.More enjoying.',
  )
  await page.getByRole('link', { name: 'Open planner' }).first().click()
  await expect(page).toHaveURL('/planner')
  await expect(page.locator('nav button[type="submit"]')).toHaveText('Sign out')
})

test('planner requires sign-in', async ({ page }) => {
  await page.goto('/planner')
  await expect(page).toHaveURL('/auth/login')
})

for (const width of [1280, 375]) {
  test(`landing language switcher works at ${width}px and remembers the visitor's choice`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?utm_source=test')
    await page.getByRole('link', { name: 'Čeština', exact: true }).click()
    await expect(page).toHaveURL('/?utm_source=test&lang=cs')
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
    await expect(
      page.getByRole('link', { name: 'Čeština', exact: true }),
    ).toHaveAttribute('aria-current', 'true')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Méně rozhodování.Více radosti.',
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.getByRole('link', { name: 'Jak to funguje' }).click()
    await page.getByRole('link', { name: 'English', exact: true }).click()
    await expect(page).toHaveURL('/?utm_source=test&lang=en#how-it-works')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.getByRole('link', { name: 'Čeština', exact: true }).click()
    await page.getByRole('link', { name: 'Vytvořit účet zdarma' }).click()
    await expect(page).toHaveURL('/auth/register')
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs')
  })
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`section links respect ${reducedMotion} motion preference`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/')
    await expect(page.locator('html')).toHaveCSS(
      'scroll-behavior',
      reducedMotion === 'reduce' ? 'auto' : 'smooth',
    )
    await page.getByRole('link', { name: 'See how it works' }).click()
    await expect(page).toHaveURL('/#how-it-works')
    await expect
      .poll(() =>
        page
          .locator('#how-it-works')
          .evaluate((section) =>
            Math.round(section.getBoundingClientRect().top),
          ),
      )
      .toBe(110)
  })
}
