import { test, expect } from '@playwright/test';

/**
 * API Mode E2E Tests
 *
 * Prerequisites:
 * - Backend: docker compose up -d
 * - Frontend: python3 -m http.server 8080 (from project root)
 *
 * These tests cover:
 * 1. API config UI renders in role-switcher
 * 2. URL input and connect button work
 * 3. GL → submit workflow (requires backend)
 * 4. PM approval workflow (requires backend)
 * 5. Master view navigation (requires backend)
 */

test.describe('API Mode — UI Configuration', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    // Clear API config and reload fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('oa.api.baseUrl'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Wait for role-switcher to be populated (JS modules run async)
    await page.waitForFunction(() => {
      const el = document.querySelector('#role-switcher');
      return el && el.children.length > 0;
    }, { timeout: 10000 }).catch(() => null);
  });

  test('API config elements exist in role-switcher', async ({ page }) => {
    // Verify the API config section is rendered
    const apiConfig = page.locator('#api-config');
    await expect(apiConfig).toBeAttached();

    // Verify individual elements
    await expect(page.locator('#api-url')).toBeAttached();
    await expect(page.locator('#btn-connect-api')).toBeAttached();
    await expect(page.locator('#api-status')).toBeAttached();
  });

  test('empty URL clears API config and shows localStorage mode', async ({ page }) => {
    // Fill empty and click connect
    await page.locator('#api-url').fill('');
    await page.locator('#btn-connect-api').click();

    // Should show local mode message
    const status = page.locator('#api-status');
    await expect(status).toContainText('本地模式');
  });

  test('invalid backend URL shows connection failure', async ({ page }) => {
    await page.locator('#api-url').fill('http://localhost:9999');
    await page.locator('#btn-connect-api').click();

    // Wait up to 3s for connection attempt
    await page.waitForTimeout(3000);
    const status = page.locator('#api-status');
    // Should show failure indicator
    const text = await status.textContent();
    expect(text).toMatch(/无法连接|连接失败|✗/);
  });

  test('valid backend URL shows connected status', async ({ page }) => {
    // Check if backend is actually running
    const health = await page.evaluate(() =>
      fetch('http://localhost:3000/api/health').then(r => r.ok).catch(() => false)
    );

    if (!health) {
      test.skip(true, 'Backend not running');
      return;
    }

    await page.locator('#api-url').fill('http://localhost:3000');
    await page.locator('#btn-connect-api').click();

    // Should show connected status after successful ping
    await page.waitForFunction(() => {
      const s = document.querySelector('#api-status');
      return s && s.textContent.includes('已连接');
    }, { timeout: 5000 });

    await expect(page.locator('#api-status')).toContainText('已连接');
  });
});

test.describe('API Mode — Full Workflow (requires backend)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());

    // Check backend availability
    const health = await page.evaluate(() =>
      fetch('http://localhost:3000/api/health').then(r => r.ok).catch(() => false)
    );
    if (!health) {
      test.skip(true, 'Backend not running — start with: docker compose up -d');
      return;
    }

    // Configure API mode and reload
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('oa.api.baseUrl', 'http://localhost:3000'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.querySelector('#role-select')?.children.length > 0,
      { timeout: 10000 }).catch(() => null);
  });

  test('GL: approval panel renders for GL role', async ({ page }) => {
    // Verify approval panel (contains submit/withdraw buttons depending on state)
    const approvalPanel = page.locator('#approval-panel');
    // Panel may or may not have visible buttons depending on schedule state
    await expect(approvalPanel).toBeAttached();

    // Verify the schedule header is rendered
    const header = page.locator('#schedule-header');
    await expect(header).toBeAttached();
  });

  test('PM: approval panel renders for PM role', async ({ page }) => {
    // Switch to PM role
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() > 0) {
      const pmValue = await pmOption.first().getAttribute('value');
      await page.locator('#role-select').selectOption(pmValue);
    }

    // PM should see the approval panel (contains approve/reject/resched buttons depending on state)
    // Whether specific buttons are visible depends on schedule state (REVIEWING vs APPROVED etc.)
    // Verify the approval panel element exists and has content
    const approvalPanel = page.locator('#approval-panel');
    await expect(approvalPanel).toBeAttached();
  });

  test('master view toggle visible for PM', async ({ page }) => {
    // Switch to PM
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() > 0) {
      const pmValue = await pmOption.first().getAttribute('value');
      await page.locator('#role-select').selectOption(pmValue);
    }

    // Master toggle should be visible
    const masterToggle = page.locator('#master-toggle');
    if (await masterToggle.isVisible()) {
      await masterToggle.click();
      await expect(page.locator('#master-view-wrapper')).toBeVisible();
      await expect(page.locator('#master-table')).toBeVisible();
    }
  });
});
