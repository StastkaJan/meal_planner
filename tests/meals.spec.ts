import { test, expect } from '@playwright/test';
import { uniqueEmail, register } from './helpers';

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail());
  await page.goto('/meals');
  await page.waitForLoadState('networkidle');
});

test('create a meal', async ({ page }) => {
  const name = `Meal-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add meal' }).click();
  await page.getByPlaceholder('Meal name').fill(name);
  await page.locator('tbody tr:first-child').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(name)).toBeVisible();
});

test('edit a meal', async ({ page }) => {
  const name = `Edit-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add meal' }).click();
  await page.getByPlaceholder('Meal name').fill(name);
  await page.locator('tbody tr:first-child').getByRole('button', { name: 'Save' }).click();
  await page.getByText(name).waitFor();

  await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Edit' }).click();
  const updated = `Updated-${Date.now()}`;
  await page.locator('tr.edit-row input[type="text"]').fill(updated);
  await page.locator('tr.edit-row').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(updated)).toBeVisible();
});

test('delete a meal', async ({ page }) => {
  const name = `Del-${Date.now()}`;
  await page.getByRole('button', { name: '+ Add meal' }).click();
  await page.getByPlaceholder('Meal name').fill(name);
  await page.locator('tbody tr:first-child').getByRole('button', { name: 'Save' }).click();
  await page.getByText(name).waitFor();

  page.once('dialog', d => d.accept());
  await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(name)).not.toBeVisible();
});
