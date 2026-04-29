import { test, expect } from '@playwright/test';

/**
 * Progress Column E2E Tests
 *
 * PE-01: WBS table shows a progress column with correct header
 * PE-02: GL can click/dblclick progress cell to trigger edit
 * PE-03: Entering a progress value and committing updates the store
 * PE-04: Progress value persists after reload
 * PE-05: PM sees GROUP task progress as read-only
 */

test.describe('WBS Progress Column', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // PE-01: WBS table shows a progress column
  test('WBS table has progress column header', async ({ page }) => {
    const headers = await page.locator('#wbs-thead th').allTextContents();
    expect(headers).toContain('进度');
  });

  // PE-02: Progress cell is visible for first task row
  test('progress cell is visible for each task row', async ({ page }) => {
    const progressCells = page.locator('td[data-col="progressPercent"]');
    await expect(progressCells.first()).toBeVisible();
  });

  // PE-03: Double-clicking progress cell shows an input for editing
  test('double-click progress cell shows input field', async ({ page }) => {
    const firstCell = page.locator('td[data-col="progressPercent"]').first();
    if (await firstCell.isVisible()) {
      await firstCell.dblclick();
      await page.waitForTimeout(100);
      const input = firstCell.locator('input[type="number"]');
      await expect(input).toBeVisible();
    }
  });

  // PE-04: Changing progress value and committing updates the store
  test('editing progress value and saving updates the store', async ({ page }) => {
    const firstCell = page.locator('td[data-col="progressPercent"]').first();
    await expect(firstCell).toBeVisible();

    await firstCell.dblclick();
    await page.waitForTimeout(100);

    const input = firstCell.locator('input[type="number"]');
    await expect(input).toBeVisible();

    await input.fill('75');
    await input.press('Enter');
    await page.waitForTimeout(500);

    // After save, the cell re-renders with the new value (read-only span)
    const cellText = await firstCell.textContent();
    expect(cellText.trim()).toBe('75%');
  });

  // PE-05: Progress value persists after page reload
  test('progress value persists after reload', async ({ page }) => {
    // First: set a progress value
    const firstCell = page.locator('td[data-col="progressPercent"]').first();
    await expect(firstCell).toBeVisible();
    // Get task ID from parent <tr>
    const taskId = await firstCell.locator('xpath=..').getAttribute('data-task-id');

    await firstCell.dblclick();
    await page.waitForTimeout(100);
    const input = firstCell.locator('input[type="number"]');
    await input.fill('60');
    await input.press('Enter');
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the cell for the same task (taskId is on <tr>, not <td>)
    const reloadedCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="progressPercent"]`);
    await expect(reloadedCell).toBeVisible();

    const cellText = await reloadedCell.locator('input').inputValue();
    expect(cellText).toBe('60');
  });

  // PE-06: Progress input validates 0-100 range
  test('progress input accepts values 0-100', async ({ page }) => {
    const firstCell = page.locator('td[data-col="progressPercent"]').first();
    await expect(firstCell).toBeVisible();

    await firstCell.dblclick();
    await page.waitForTimeout(100);
    const input = firstCell.locator('input[type="number"]');

    // Check min/max attributes are set
    const min = await input.getAttribute('min');
    const max = await input.getAttribute('max');
    expect(min).toBe('0');
    expect(max).toBe('100');
  });
});
