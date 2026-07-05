import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/meals');
  await page.waitForLoadState('networkidle');
});

test('meal name links to detail page', async ({ page }) => {
  const name = `Detail-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add meal' }).click();
  await page.getByPlaceholder('Meal name').fill(name);
  await page.locator('tbody tr:first-child').getByRole('button', { name: 'Save' }).click();
  await page.getByText(name).click();
  await expect(page.locator('h1')).toHaveText(name);
  await expect(page).not.toHaveURL('/meals');
});

test('edit meal from detail page', async ({ page }) => {
  const name = `Edit-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add meal' }).click();
  await page.getByPlaceholder('Meal name').fill(name);
  await page.locator('tbody tr:first-child').getByRole('button', { name: 'Save' }).click();
  await page.getByText(name).click();

  await page.getByRole('button', { name: 'Edit' }).click();
  const updated = `Updated-${Date.now()}`;
  await page.locator('input[type="text"]').first().fill(updated);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('h1')).toHaveText(updated);
});

test('delete meal from detail page', async ({ page }) => {
  const name = `Del-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add meal' }).click();
  await page.getByPlaceholder('Meal name').fill(name);
  await page.locator('tbody tr:first-child').getByRole('button', { name: 'Save' }).click();
  await page.getByText(name).click();

  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL('/meals');
});
