import { test, expect } from '@playwright/test';

test('smoke: project tree renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('OA 平台')).toBeVisible();
  await expect(page.getByText('2026-Q2 迭代')).toBeVisible();
});

test('smoke: role switcher works', async ({ page }) => {
  await page.goto('/');
  const select = page.locator('select');
  await expect(select).toBeVisible();
  await select.selectOption('p1');
  await expect(page.locator('option[value="p1"]')).toBeSelected();
});
