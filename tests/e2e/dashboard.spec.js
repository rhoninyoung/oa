import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * Prerequisites:
 * - Frontend: python3 -m http.server 8080
 * - Running at http://localhost:8080
 *
 * DE-01..03: Dashboard view renders all sections
 * DE-04..05: Pending/reviewing count badges
 * DE-06..08: Progress bars display correctly
 */

test.describe('Dashboard View', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // DE-01: Dashboard tab exists and navigates
  test('dashboard tab exists and renders dashboard view', async ({ page }) => {
    const dashboardTab = page.locator('#tab-dashboard');
    await expect(dashboardTab).toBeAttached();

    await dashboardTab.click();
    await page.waitForTimeout(300); // allow render

    const wrapper = page.locator('#dashboard-view-wrapper');
    await expect(wrapper).toBeVisible();
  });

  // DE-02: Dashboard shows stat cards section
  test('dashboard shows stat cards (pending count, lagging count)', async ({ page }) => {
    await page.locator('#tab-dashboard').click();
    await page.waitForTimeout(300);

    // Stat cards should be visible
    const statCards = page.locator('.stat-card');
    await expect(statCards.first()).toBeVisible();
  });

  // DE-03: Dashboard shows progress bars section
  test('dashboard shows group progress bars', async ({ page }) => {
    await page.locator('#tab-dashboard').click();
    await page.waitForTimeout(300);

    const progressBars = page.locator('.progress-bar-item');
    const count = await progressBars.count();
    expect(count).toBeGreaterThan(0);
  });

  // DE-04: Dashboard shows quick actions section
  test('dashboard shows quick action buttons', async ({ page }) => {
    await page.locator('#tab-dashboard').click();
    await page.waitForTimeout(300);

    const quickActions = page.locator('.dashboard-quick-actions');
    await expect(quickActions).toBeVisible();
  });

  // DE-05: Switching to PM role shows correct pending review count
  test('PM role sees reviewing count badge', async ({ page }) => {
    // Switch to PM
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() > 0) {
      const pmValue = await pmOption.first().getAttribute('value');
      await page.locator('#role-select').selectOption(pmValue);
    }

    await page.locator('#tab-dashboard').click();
    await page.waitForTimeout(300);

    // Should show reviewing count for PM
    const reviewingCard = page.locator('.stat-card').filter({ hasText: '待审批' });
    await expect(reviewingCard).toBeVisible();
  });
});

test.describe('Dashboard — no-backend localStorage mode', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // DE-06: Dashboard renders even without seed data tasks
  test('dashboard renders with empty state gracefully', async ({ page }) => {
    // Clear localStorage to ensure empty state
    await page.evaluate(() => localStorage.removeItem('oa.state.v1'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.locator('#tab-dashboard').click();
    await page.waitForTimeout(300);

    // Should still render, just with zeros
    const wrapper = page.locator('#dashboard-view-wrapper');
    await expect(wrapper).toBeVisible();
  });
});
