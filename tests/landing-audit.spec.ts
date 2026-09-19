import { expect, test } from '@playwright/test'

test('@smoke unknown resources return 404 while private pages require sign-in', async ({
  request,
}) => {
  for (const path of ['/does-not-exist', '/.well-known/ai-catalog.json']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(404)
  }
  for (const path of ['/planner', '/profile', '/meals', '/admin/recipes']) {
    const response = await request.get(path, {
      maxRedirects: 0,
      headers: { accept: 'text/html' },
    })
    expect(response.status(), path).toBe(303)
    expect(response.headers().location).toBe('/auth/login')
  }
})

test('@smoke robots.txt is public plain text without a redirect', async ({
  request,
}) => {
  const response = await request.get('/robots.txt', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/plain')
  expect(await response.text()).toMatch(/^User-agent: \*\r?\nAllow: \/\s*$/)
})

test('@smoke llms.txt provides a public summary and working public links', async ({
  request,
}) => {
  const response = await request.get('/llms.txt', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/plain')
  const text = await response.text()
  expect(text).toMatch(/^# Papu Plan\r?\n/)
  const links = [
    ...text.matchAll(/\[[^\]]+\]\((https:\/\/papuplan\.cz[^)]+)\)/g),
  ]
  expect(links.length).toBeGreaterThan(0)
  for (const [, link] of links) {
    const page = await request.get(new URL(link).pathname, { maxRedirects: 0 })
    expect(page.status(), link).toBe(200)
  }
})

test('@smoke the logo uses a versioned URL with long-lived caching', async ({
  page,
  request,
}) => {
  await page.goto('/')
  const logo = page.getByRole('img', { name: 'Papu Plan', exact: true })
  const src = await logo.getAttribute('src')
  expect(src).toMatch(/\/_app\/immutable\/assets\/logo\.[\w-]+\.svg$/)
  const response = await request.get(new URL(src!, page.url()).href)
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('immutable')
  expect(response.headers()['cache-control']).toContain('max-age=31536000')
})

test.describe('landing first render', () => {
  test.use({ javaScriptEnabled: false })

  for (const width of [375, 1280]) {
    test(`@smoke readable landing at ${width}px without JavaScript or a loaded logo`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.route('**/logo*.svg', (route) => route.abort())
      const stylesheets: string[] = []
      page.on('request', (request) => {
        if (request.resourceType() === 'stylesheet')
          stylesheets.push(request.url())
      })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(stylesheets).toEqual([])

      const contrast = await page
        .locator('.breakfast .meal-slot')
        .evaluate((label) => {
          function luminance(color: string) {
            const channels = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map((value) => {
                const channel = Number(value) / 255
                return channel <= 0.04045
                  ? channel / 12.92
                  : ((channel + 0.055) / 1.055) ** 2.4
              })
            return (
              channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
            )
          }
          const foreground = luminance(getComputedStyle(label).color)
          const background = luminance(
            getComputedStyle(label.closest('.meal')!).backgroundColor,
          )
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          )
        })
      expect(contrast).toBeGreaterThanOrEqual(4.5)

      const logo = await page
        .getByRole('img', { name: 'Papu Plan', exact: true })
        .boundingBox()
      expect(logo).not.toBeNull()
      expect(logo!.width).toBe(width === 375 ? 120 : 145)
      expect(logo!.height).toBeCloseTo(width === 375 ? (120 * 44) / 188 : 34, 1)
    })
  }
})
