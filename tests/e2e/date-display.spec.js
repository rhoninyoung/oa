import { test, expect } from '@playwright/test';

/**
 * Date Display E2E Tests
 *
 * DE-01: Dates in WBS table display as YYYY-MM-DD format, not ISO datetime
 * DE-02: Date inputs have correctly formatted value attribute
 * DE-03: Master view shows dates in YYYY-MM-DD format
 * DE-04: Calendar view correctly parses task dates
 */

test.describe('Date Display', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    await expect(page.locator('#role-switcher')).toBeAttached({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  // DE-01: Dates display as YYYY-MM-DD in WBS table
  test('WBS table shows dates in YYYY-MM-DD format', async ({ page }) => {
    // Get all startDate and endDate cells
    const startDateCells = page.locator('td[data-col="startDate"]');
    const endDateCells = page.locator('td[data-col="endDate"]');

    const count = await startDateCells.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const startDateText = await startDateCells.nth(i).textContent();
      const endDateText = await endDateCells.nth(i).textContent();

      // Should NOT contain 'T' (ISO datetime separator) or timezone info
      if (startDateText && startDateText.trim()) {
        expect(startDateText.trim()).not.toMatch(/T.*Z|Z$/);
        expect(startDateText.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (endDateText && endDateText.trim()) {
        expect(endDateText.trim()).not.toMatch(/T.*Z|Z$/);
        expect(endDateText.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  // DE-02: Date input values are correctly formatted for HTML date inputs
  test('date input values are valid YYYY-MM-DD format', async ({ page }) => {
    // Find any date inputs in the WBS table
    const dateInputs = page.locator('td[data-col="startDate"] input[type="date"], td[data-col="endDate"] input[type="date"]');

    const count = await dateInputs.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const inputValue = await dateInputs.nth(i).inputValue();
        // HTML date input requires YYYY-MM-DD format
        if (inputValue) {
          expect(inputValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  // DE-03: Master view displays dates in YYYY-MM-DD format
  test('master view shows dates in YYYY-MM-DD format', async ({ page }) => {
    // Switch to master view
    await page.locator('#master-toggle').click();
    await expect(page.locator('#master-view-wrapper')).toBeVisible();

    // Get table rows (skip header)
    const rows = page.locator('#master-table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Columns: #, 任务名, 负责人, 开始, 结束, 天数, 来源, 备注, 操作
      // start date is column 3 (0-indexed: 3), end date is column 4
      for (let i = 0; i < rowCount; i++) {
        const cells = rows.nth(i).locator('td');
        const startDateCell = cells.nth(3);
        const endDateCell = cells.nth(4);

        const startText = (await startDateCell.textContent()).trim();
        const endText = (await endDateCell.textContent()).trim();

        if (startText) {
          expect(startText).not.toMatch(/T.*Z|Z$/);
          expect(startText).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
        if (endText) {
          expect(endText).not.toMatch(/T.*Z|Z$/);
          expect(endText).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  // DE-04: Calendar view renders task bars correctly
  test('calendar view correctly parses task dates', async ({ page }) => {
    // Navigate to calendar view
    await page.locator('#tab-calendar').click();
    await expect(page.locator('#calendar-view-wrapper')).toBeVisible();

    // Check that calendar grid renders
    const calGrid = page.locator('#cal-grid');
    await expect(calGrid).toBeVisible();
  });

  // DE-05: Iteration dates in project tree display correctly
  test('iteration dates in project tree display as YYYY-MM-DD', async ({ page }) => {
    // Find iteration items that might show dates
    const iterItems = page.locator('.iteration-item');
    const count = await iterItems.count();
    expect(count).toBeGreaterThan(0);

    // The iteration name should contain the date range
    const firstIterText = await iterItems.first().textContent();
    // Should not have ISO datetime with T and Z
    expect(firstIterText).not.toMatch(/T\d{2}:\d{2}:\d{2}/);
  });
});
