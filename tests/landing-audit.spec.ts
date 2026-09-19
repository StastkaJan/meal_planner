import { expect, test } from '@playwright/test'

test('@smoke robots.txt is public plain text without a redirect', async ({
  request,
}) => {
  const response = await request.get('/robots.txt', { maxRedirects: 0 })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/plain')
  expect(await response.text()).toMatch(/^User-agent: \*\r?\nAllow: \/\s*$/)
})

test.describe('landing first render', () => {
  test.use({ javaScriptEnabled: false })

  for (const width of [375, 1280]) {
    test(`@smoke readable landing at ${width}px without JavaScript or a loaded logo`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.route('**/logo.svg', (route) => route.abort())
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
