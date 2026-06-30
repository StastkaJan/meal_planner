import { test, expect } from '@playwright/test';
import { uniqueEmail, register } from './helpers';

test.beforeEach(async ({ page }) => {
  await register(page, uniqueEmail());
  await page.waitForLoadState('networkidle');
});

test('create a plan', async ({ page }) => {
  await page.getByRole('button', { name: '+ New plan' }).click();
  await page.getByPlaceholder('Plan name\u2026').fill('My Test Plan');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('.tab', { hasText: 'My Test Plan' })).toBeVisible();
});

test('delete a plan', async ({ page }) => {
  await page.getByRole('button', { name: '+ New plan' }).click();
  await page.getByPlaceholder('Plan name\u2026').fill('Delete Me');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('.tab', { hasText: 'Delete Me' })).toBeVisible();

  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.tab', { hasText: 'Delete Me' })).not.toBeVisible();
});
