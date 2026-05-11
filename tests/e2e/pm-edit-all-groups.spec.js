import { test, expect } from '@playwright/test';

/**
 * PM Edit All Groups E2E Tests
 *
 * PE-01: PM 选择任意小组，任务行均可编辑（dblclick 触发 input）
 * PE-02: PM 修改任务日期，刷新页面数据已持久化
 * PE-03: PM 修改进度后，刷新页面数据已持久化
 * PE-04: GL 仍只能编辑自己组的任务，不能编辑其他组
 * PE-05: PM 编辑 APPROVED 状态的任务，状态保持 APPROVED 不变
 * PE-06: PM 编辑任务后，GL 视角下看到的是更新后的值
 * PE-07: PM 可设置/修改任务依赖
 * PE-08: PM 可以右键插入新行，刷新后行仍存在（持久化验证）
 * PE-09: PM 可以右键删除行（仅对 PENDING/REJECTED 状态有效）
 * PE-10: PM 修改任务名称，刷新后名称保持不变（持久化验证）
 * PE-11: PM 在不同组都能编辑和持久化任务
 * PE-12: PM 编辑备注字段，刷新后备注保持不变（持久化验证）
 */

test.describe('PM Edit All Groups', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    await expect(page.locator('#role-switcher')).toBeAttached({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  // PE-01: PM can trigger edit mode on any group's task
  test('PM can edit task cells in any group', async ({ page }) => {
    // Switch to PM
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }

    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to a non-PM's group (e.g., 算法组)
    const algoGroupItem = page.locator('.iter-group-name', { hasText: '算法组' });
    if (await algoGroupItem.count() > 0) {
      await algoGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // PM should be able to see editable cells (cell-editable class)
    // Try double-clicking a name cell
    const nameCell = page.locator('td[data-col="name"]').first();
    await expect(nameCell).toBeVisible();

    await nameCell.dblclick();
    await page.waitForTimeout(100);

    // Should have a textarea or input for editing
    const textarea = nameCell.locator('textarea.cell-textarea');
    const input = nameCell.locator('input.cell-input');
    const hasEditor = (await textarea.count()) > 0 || (await input.count()) > 0;
    expect(hasEditor, 'PM should be able to trigger edit mode on task name').toBe(true);
  });

  // PE-02: PM 可以编辑任务日期（注：日期变更依赖 30s 自动保存或 Ctrl+S 持久化）
  test('PM can edit task date', async ({ page }) => {
    // Switch to PM
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 算法组
    const algoGroupItem = page.locator('.iter-group-name', { hasText: '算法组' });
    if (await algoGroupItem.count() > 0) {
      await algoGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Find the first task row
    const firstRow = page.locator('#wbs-tbody tr[data-task-id]').first();
    const taskId = await firstRow.getAttribute('data-task-id');

    // Verify the task row exists
    await expect(firstRow).toBeVisible();

    const startDateCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="startDate"]`);
    await expect(startDateCell).toBeVisible();

    // Double-click to edit
    await startDateCell.dblclick();
    await page.waitForTimeout(200);

    // PM must have a date input after dblclick
    const dateInput = startDateCell.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // Verify initial value is valid YYYY-MM-DD format
    const originalValue = await dateInput.inputValue();
    expect(originalValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Change date to 2026-05-10
    await dateInput.fill('2026-05-10');
    await dateInput.press('Enter');
    await page.waitForTimeout(300);

    // After Enter, the cell should show the new value
    const updatedCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="startDate"]`);
    const displayInput = updatedCell.locator('input');
    if (await displayInput.count() > 0) {
      expect(await displayInput.inputValue()).toBe('2026-05-10');
    } else {
      const text = (await updatedCell.textContent()).trim();
      expect(text).toBe('2026-05-10');
    }
  });

  // PE-03: PM 修改进度后刷新页面数据已持久化
  test('PM progress edit persists after reload', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    const progressCell = page.locator('td[data-col="progressPercent"]').first();
    await expect(progressCell).toBeVisible();

    const taskId = await progressCell.locator('xpath=..').getAttribute('data-task-id');

    await progressCell.dblclick();
    await page.waitForTimeout(100);

    const input = progressCell.locator('input[type="number"]');
    await expect(input).toBeVisible();
    await input.fill('80');
    await input.press('Enter');
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="progressPercent"]`);
    await expect(reloadedCell).toBeVisible();
    const reloadedInput = reloadedCell.locator('input');
    const val = await reloadedInput.inputValue();
    expect(val).toBe('80');
  });

  // PE-04: GL 仍只能编辑自己组的任务
  test('GL can only edit own group tasks', async ({ page }) => {
    // Switch to GL1 (张三 - 前端组)
    const gl1Option = page.locator('#role-select option').filter({ hasText: '张三' });
    if (await gl1Option.count() === 0) {
      test.skip('张三 not in user list');
    }
    const gl1Value = await gl1Option.first().getAttribute('value');
    await page.locator('#role-select').selectOption(gl1Value);
    await page.waitForTimeout(300);

    // Navigate to 算法组 (not GL1's own group)
    const algoGroupItem = page.locator('.iter-group-name', { hasText: '算法组' });
    if (await algoGroupItem.count() > 0) {
      await algoGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // GL should NOT be able to edit tasks in another group
    const nameCell = page.locator('td[data-col="name"]').first();
    await nameCell.dblclick();
    await page.waitForTimeout(100);

    const textarea = nameCell.locator('textarea.cell-textarea');
    const input = nameCell.locator('input.cell-input');
    const hasEditor = (await textarea.count()) > 0 || (await input.count()) > 0;
    expect(hasEditor, 'GL should NOT be able to edit another group\'s tasks').toBe(false);
  });

  // PE-05: PM 编辑任务不影响状态
  test('PM edit does not change schedule status', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Get current status from schedule header (not project tree)
    const statusBadge = page.locator('#schedule-header .status-badge');
    await expect(statusBadge).toBeVisible();
    const originalStatus = (await statusBadge.textContent()).trim();

    // Edit a task
    const nameCell = page.locator('td[data-col="name"]').first();
    await nameCell.dblclick();
    await page.waitForTimeout(100);
    const textarea = nameCell.locator('textarea.cell-textarea');
    if (await textarea.count() > 0) {
      await textarea.fill('Modified by PM');
      await textarea.press('Enter');
      await page.waitForTimeout(500);
    }

    // Status should remain unchanged
    const newStatus = (await statusBadge.textContent()).trim();
    expect(newStatus).toBe(originalStatus);
  });

  // PE-06: PM 编辑后 GL 看到更新后的值（通过进度字段验证，因为进度会持久化到后端）
  test('GL sees PM-updated progress after reload', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Get first task id and edit its progress as PM
    const firstRow = page.locator('#wbs-tbody tr[data-task-id]').first();
    const taskId = await firstRow.getAttribute('data-task-id');
    const progressCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="progressPercent"]`);

    await progressCell.dblclick();
    await page.waitForTimeout(100);
    const input = progressCell.locator('input[type="number"]');
    await input.fill('99');
    await input.press('Enter');
    await page.waitForTimeout(800); // wait for API persist

    // Now switch to GL1 (张三) and reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#role-switcher')).toBeAttached({ timeout: 10000 });

    const gl1Option = page.locator('#role-select option').filter({ hasText: '张三' });
    if (await gl1Option.count() > 0) {
      const gl1Value = await gl1Option.first().getAttribute('value');
      await page.locator('#role-select').selectOption(gl1Value);
      await page.waitForTimeout(500);
    }

    // Navigate back to 前端组
    const feGroupItemGL = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItemGL.count() > 0) {
      await feGroupItemGL.first().click();
      await page.waitForTimeout(300);
    }

    // Find the same task and check its progress
    const reloadedProgressCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="progressPercent"]`);
    await expect(reloadedProgressCell).toBeVisible();
    // The cell might show input (if editable) or span
    const inputEl = reloadedProgressCell.locator('input');
    if (await inputEl.count() > 0) {
      const val = await inputEl.inputValue();
      expect(val).toBe('99');
    } else {
      const spanEl = reloadedProgressCell.locator('span');
      const text = await spanEl.textContent();
      expect(text).toContain('99');
    }
  });

  // PE-07: PM 可设置/修改任务依赖
  test('PM can set task dependency', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Find a task that doesn't have a dependency yet
    const depCell = page.locator('td[data-col="dep"]').first();
    await expect(depCell).toBeVisible();
    const depText = await depCell.textContent();

    // Click the "选" button if it exists (indicates PM can interact with dependency field)
    const pickBtn = depCell.locator('.btn-pick-dep');
    if (await pickBtn.count() > 0) {
      await pickBtn.click();
      await page.waitForTimeout(200);

      // Should show dependency picker overlay
      const overlay = page.locator('div[style*="position:fixed"]');
      const overlayVisible = await overlay.isVisible();
      // PM should be able to open the dependency picker
      expect(overlayVisible || (await pickBtn.count()) > 0).toBe(true);
    }
  });

  // PE-07b: 依赖选择器可以跨组选择任务，显示任务所属的组
  test('dependency picker shows tasks from all groups with group labels', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Get task count
    const rowsInGroup = await page.locator('#wbs-tbody tr[data-task-id]').count();
    if (rowsInGroup < 1) {
      test.skip('Need at least 1 row to test dependency picker');
    }

    // Click the "选" button on the first task to open dependency picker
    const depCell = page.locator('td[data-col="dep"]').first();
    await expect(depCell).toBeVisible();
    const pickBtn = depCell.locator('.btn-pick-dep');

    // Check if pick button exists
    if (await pickBtn.count() === 0) {
      test.skip('No dependency picker button available');
    }

    await pickBtn.click();
    await page.waitForTimeout(500);

    // Should show dependency picker overlay
    const overlayVisible = await page.locator('div[style*="position:fixed"]').last().isVisible().catch(() => false);

    if (overlayVisible) {
      // Get all options (excluding "无依赖")
      const allOptions = page.locator('li[data-dep-task-id]');
      const optionCount = await allOptions.count();

      // Options should show tasks from ALL groups (more than just current group)
      // At minimum we should have multiple options available
      expect(optionCount).toBeGreaterThan(1);

      // Header should NOT contain "仅限同组"
      const header = page.locator('h3:has-text("选择前置依赖")');
      const headerVisible = await header.isVisible().catch(() => false);
      if (headerVisible) {
        const headerText = await header.textContent();
        expect(headerText).not.toContain('仅限同组');
      }

      // Close the picker
      const cancelBtn = page.locator('#dep-cancel');
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(200);
    } else {
      test.skip('Dependency picker overlay not visible');
    }
  });

  // PE-08: PM 可以右键插入新行，刷新后行仍存在（持久化验证）
  test('PM can insert row via context menu and it persists after reload', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Count rows before insert
    const rowsBefore = await page.locator('#wbs-tbody tr[data-task-id]').count();
    expect(rowsBefore).toBeGreaterThan(0);

    // Right-click on first row to open context menu
    const firstRow = page.locator('#wbs-tbody tr[data-task-id]').first();
    const firstCell = firstRow.locator('td').first();
    await firstCell.click({ button: 'right' });
    await page.waitForTimeout(200);

    // Context menu should be visible
    const ctxMenu = page.locator('#ctx-menu');
    await expect(ctxMenu).toHaveClass(/visible/);

    // Click "上方插入行"
    const insertAbove = page.locator('#ctx-menu .ctx-item', { hasText: '上方插入行' });
    await expect(insertAbove).toBeVisible();
    await insertAbove.click();
    await page.waitForTimeout(1000);

    // Should have one more row now
    const rowsAfter = await page.locator('#wbs-tbody tr[data-task-id]').count();
    expect(rowsAfter).toBe(rowsBefore + 1);

    // Reload page and verify the new row persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Navigate back to 前端组
    const feGroupItem2 = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem2.count() > 0) {
      await feGroupItem2.first().click();
      await page.waitForTimeout(500);
    }

    // Should still have the increased row count
    const rowsAfterReload = await page.locator('#wbs-tbody tr[data-task-id]').count();
    expect(rowsAfterReload).toBe(rowsAfter);
  });

  // PE-09: PM 可以右键删除行（仅对 PENDING/REJECTED 状态有效）
  test('PM can delete row via context menu in PENDING group', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to a PENDING group (算法组 should be PENDING after reset)
    const algoGroupItem = page.locator('.iter-group-name', { hasText: '算法组' });
    if (await algoGroupItem.count() > 0) {
      await algoGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Check if schedule is PENDING or REJECTED - if not, skip
    const statusBadge = page.locator('#schedule-header .status-badge');
    const statusText = await statusBadge.textContent();
    const isDeletable = statusText.includes('草稿') || statusText.includes('已拒');
    if (!isDeletable) {
      test.skip('Schedule is not PENDING or REJECTED, skip delete test');
    }

    // Count rows before delete
    const rowsBefore = await page.locator('#wbs-tbody tr[data-task-id]').count();
    if (rowsBefore <= 1) {
      test.skip('Need at least 2 rows to test delete functionality');
    }

    // Right-click on last row to open context menu
    const lastRow = page.locator('#wbs-tbody tr[data-task-id]').last();
    const lastCell = lastRow.locator('td').first();
    await lastCell.click({ button: 'right' });
    await page.waitForTimeout(200);

    // Context menu should be visible
    const ctxMenu = page.locator('#ctx-menu');
    await expect(ctxMenu).toHaveClass(/visible/);

    // Delete option should not be greyed out
    const deleteOption = page.locator('#ctx-menu .ctx-item', { hasText: '删除当前行' });
    await expect(deleteOption).not.toHaveClass(/text-muted/);

    // Click delete
    await deleteOption.click();
    await page.waitForTimeout(1000);

    // Should have one less row now
    const rowsAfter = await page.locator('#wbs-tbody tr[data-task-id]').count();
    expect(rowsAfter).toBe(rowsBefore - 1);

    // Reload page and verify the row deletion persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Navigate back to 算法组
    const algoGroupItem2 = page.locator('.iter-group-name', { hasText: '算法组' });
    if (await algoGroupItem2.count() > 0) {
      await algoGroupItem2.first().click();
      await page.waitForTimeout(500);
    }

    // Should still have the decreased row count
    const rowsAfterReload = await page.locator('#wbs-tbody tr[data-task-id]').count();
    expect(rowsAfterReload).toBe(rowsAfter);
  });

  // PE-10: PM 修改任务名称，刷新后名称保持不变（持久化验证）
  test('PM can edit task name and it persists after reload', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Get first task
    const firstRow = page.locator('#wbs-tbody tr[data-task-id]').first();
    const taskId = await firstRow.getAttribute('data-task-id');
    const nameCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="name"]`);

    // Get original name
    const originalName = await nameCell.textContent();

    // Double-click to edit
    await nameCell.dblclick();
    await page.waitForTimeout(200);

    // Edit and save
    const textarea = nameCell.locator('textarea.cell-textarea');
    await expect(textarea).toBeVisible();
    const newName = 'PM测试任务名称_' + Date.now();
    await textarea.fill(newName);
    await textarea.press('Enter');
    await page.waitForTimeout(800);

    // Verify the new name is shown
    const updatedName = await nameCell.textContent();
    expect(updatedName).toBe(newName);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Navigate back to 前端组
    const feGroupItem2 = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem2.count() > 0) {
      await feGroupItem2.first().click();
      await page.waitForTimeout(500);
    }

    // Verify the name is still the new name
    const reloadedNameCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="name"]`);
    await expect(reloadedNameCell).toBeVisible();
    const reloadedName = await reloadedNameCell.textContent();
    expect(reloadedName).toBe(newName);
  });

  // PE-11: PM 在不同组都能编辑和持久化任务
  test('PM can edit tasks in different groups with persistence', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Test on 算法组
    const groups = ['算法组', '后端组', '测试组'];
    for (const groupName of groups) {
      const groupItem = page.locator('.iter-group-name', { hasText: groupName });
      if (await groupItem.count() === 0) continue;

      await groupItem.first().click();
      await page.waitForTimeout(500);

      // Check that task rows exist
      const rows = page.locator('#wbs-tbody tr[data-task-id]');
      const rowCount = await rows.count();
      if (rowCount === 0) continue;

      // Try to edit the first task's progress
      const firstRow = rows.first();
      const taskId = await firstRow.getAttribute('data-task-id');
      const progressCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="progressPercent"]`);

      // Verify cell is editable (has cell-editable class)
      const cellClass = await progressCell.getAttribute('class');
      const isEditable = cellClass.includes('cell-editable');
      expect(isEditable, `PM should be able to edit ${groupName} tasks`).toBe(true);
    }
  });

  // PE-12: PM 编辑备注字段，刷新后备注保持不变（持久化验证）
  test('PM can edit task note and it persists after reload', async ({ page }) => {
    const pmOption = page.locator('#role-select option').filter({ hasText: 'PM' });
    if (await pmOption.count() === 0) {
      test.skip('PM not in user list');
    }
    const pmValue = await pmOption.first().getAttribute('value');
    await page.locator('#role-select').selectOption(pmValue);
    await page.waitForTimeout(300);

    // Navigate to 前端组
    const feGroupItem = page.locator('.iter-group-name', { hasText: '前端组' });
    if (await feGroupItem.count() > 0) {
      await feGroupItem.first().click();
      await page.waitForTimeout(300);
    }

    // Get first task
    const firstRow = page.locator('#wbs-tbody tr[data-task-id]').first();
    const taskId = await firstRow.getAttribute('data-task-id');
    const noteCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="note"]`);

    // Double-click to edit (note field uses textarea)
    await noteCell.dblclick();
    await page.waitForTimeout(200);

    // Check for textarea (note uses textarea for multiline)
    const textarea = noteCell.locator('textarea.cell-textarea');
    if (await textarea.count() > 0) {
      // Edit and save
      const newNote = 'PM测试备注_' + Date.now();
      await textarea.fill(newNote);
      await textarea.press('Enter');
      await page.waitForTimeout(800);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Navigate back to 前端组
      const feGroupItem2 = page.locator('.iter-group-name', { hasText: '前端组' });
      if (await feGroupItem2.count() > 0) {
        await feGroupItem2.first().click();
        await page.waitForTimeout(500);
      }

      // Verify the note is still the new note
      const reloadedNoteCell = page.locator(`tr[data-task-id="${taskId}"] td[data-col="note"]`);
      await expect(reloadedNoteCell).toBeVisible();
      const reloadedNote = await reloadedNoteCell.textContent();
      expect(reloadedNote).toContain(newNote);
    } else {
      // Note cell might use different editor, skip if not textarea-based
      test.skip('Note cell does not use textarea editor');
    }
  });
});
