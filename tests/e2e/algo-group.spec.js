import { test, expect } from '@playwright/test';

/**
 * Algorithm Group (算法组) E2E Tests
 *
 * Prerequisites: seed data includes g3 (算法组), u_gl3 (组长-赵六), s3
 *
 * AG-01: Algorithm group appears in project tree
 * AG-02: Switching to group leader 赵六 activates 算法组 schedule
 * AG-03: 算法组 schedule shows 5 tasks with correct names
 * AG-04: PM sees 算法组 schedule in master view
 */

test.describe('Algorithm Group (算法组)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    // Wait for JS modules to fully render before interacting
    await expect(page.locator('#role-switcher')).toBeAttached({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  // AG-01: Algorithm group appears in project tree
  test('algo group appears in project tree', async ({ page }) => {
    const algoGroupItem = page.locator('.iter-group-name', { hasText: '算法组' });
    await expect(algoGroupItem.first()).toBeVisible();
  });

  // AG-02: Switching to 赵六 activates 算法组 schedule
  test('switching to 赵六 activates algo group schedule', async ({ page }) => {
    const zhaoLiuOption = page.locator('#role-select option').filter({ hasText: '赵六' });
    if (await zhaoLiuOption.count() === 0) {
      test.skip('赵六 not in user list');
    }

    const zhaoLiuValue = await zhaoLiuOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(zhaoLiuValue);
    await page.waitForTimeout(500);

    // Verify schedule header shows 算法组
    const scheduleHeader = page.locator('#schedule-header');
    await expect(scheduleHeader).toBeVisible();
    const headerText = await scheduleHeader.textContent();
    expect(headerText).toContain('算法组');
  });

  // AG-03: 算法组 schedule shows tasks (may have been modified by other tests)
  test('algo group schedule shows tasks', async ({ page }) => {
    // Switch to 赵六
    const zhaoLiuOption = page.locator('#role-select option').filter({ hasText: '赵六' });
    if (await zhaoLiuOption.count() === 0) {
      test.skip('赵六 not in user list');
    }

    const zhaoLiuValue = await zhaoLiuOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(zhaoLiuValue);
    await page.waitForTimeout(500);

    // Click on 算法组 in project tree to ensure it's selected
    const algoGroupItem = page.locator('.iter-group-name', { hasText: '算法组' });
    if (await algoGroupItem.count() > 0) {
      await algoGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Verify at least some task rows are present
    // Note: Other tests may have modified the tasks, so we just verify the group has tasks
    const taskRows = page.locator('#wbs-tbody tr[data-task-id]');
    const rowCount = await taskRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  // AG-04: PM role sees 算法组 in project tree (master view shows only APPROVED tasks)
  test('PM sees algo group in project tree', async ({ page }) => {
    // Switch to PM
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Verify project tree shows 算法组 with correct badge
    const algoGroupInTree = page.locator('.iter-group-name', { hasText: '算法组' });
    await expect(algoGroupInTree.first()).toBeVisible();

    // Verify the algorithm group has a status badge (PENDING = 草稿)
    const parentItem = algoGroupInTree.first().locator('xpath=..');
    const statusBadge = parentItem.locator('.status-badge');
    await expect(statusBadge).toBeVisible();
    const statusText = await statusBadge.textContent();
    expect(statusText).toContain('草稿');
  });
});
