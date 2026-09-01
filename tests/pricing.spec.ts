import { expect, test } from '@playwright/test'

test('pricing explains Free and Pro without requiring sign in', async ({
  page,
}) => {
  await page.goto('/pricing')

  await expect(
    page.getByRole('heading', {
      name: 'Simple plans for better weekly meals.',
    }),
  ).toBeVisible()
  await expect(page.getByText('Free plan')).toBeVisible()
  await expect(page.getByText('Pro plan')).toBeVisible()
  await expect(page).toHaveURL('/pricing')
})
