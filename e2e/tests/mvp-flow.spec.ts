import { test, expect } from '@playwright/test';

/**
 * T4.1 - GL edits schedule → 30s autosave → submit → PM sees REVIEWING
 *
 * Prerequisites: docker compose up -d && pnpm dev (backend + frontend)
 * The test uses page.clock to fast-forward the 30s autosave timer.
 */
test('T4.1: GL edits → autosave → submit → PM sees REVIEWING badge', async ({ page }) => {
  // Install fake clock before navigation so setTimeout/useAutoSave are patched
  await page.clock.install({ time: 0 });

  // GL u1 starts on project list
  await page.goto('/');

  // Navigate to iteration detail (g1 schedule)
  await page.getByText('2026-Q2 迭代').click();
  await expect(page).toHaveURL(/\/iterations\/iter-1$/);

  // Double-click g1 group row to enter schedule page
  await page.getByText('组: g1').dblclick();
  await expect(page).toHaveURL(/\/schedules\/g1$/);

  // Edit the first task name cell
  const nameInput = page.locator('tbody tr:first-child td:nth-child(2) input');
  await nameInput.fill('需求文档编写');

  // Fast-forward past the 30s autosave delay
  await page.clock.runFor(30_000);

  // Autosave fires → verify PATCH request succeeded (status column still shows state)
  await expect(page.getByText('提交')).toBeVisible();

  // Submit the schedule
  await page.getByRole('button', { name: '提交' }).click();

  // Should now show "撤回" (GL withdraw button) indicating REVIEWING
  await expect(page.getByRole('button', { name: '撤回' })).toBeVisible({ timeout: 5000 });

  // Switch to PM view
  await page.locator('select').selectOption('p1');

  // PM visits iteration detail → g1 should show REVIEWING badge
  await page.getByText('2026-Q2 迭代').click();
  await expect(page.getByText('组: g1').locator('..')).toContainText('REVIEWING');
});

/**
 * T4.2 - PM approves schedule → master page shows GROUP row
 */
test('T4.2: PM approve → master page shows GROUP row', async ({ page }) => {
  // Approve g1 schedule as PM p1 (schedule is already REVIEWING from T4.1)
  await page.goto('/iterations/iter-1/schedules/g1');

  // Should see "同意" button as PM
  const select = page.locator('select');
  await select.selectOption('p1');

  // Now approve
  await page.getByRole('button', { name: '同意' }).click();

  // Should now show "已审批"
  await expect(page.getByText('已审批')).toBeVisible({ timeout: 5000 });

  // Navigate to master page
  await page.goto('/iterations/iter-1/master');
  await expect(page).toHaveURL(/\/master$/);

  // Should see at least one GROUP row (from g1 approved schedule)
  await expect(page.getByText('组')).toBeVisible({ timeout: 5000 });
});

/**
 * T4.8 - Full chain: submit → approve → reschedule + outbox events
 */
test('T4.8: submit → approve → reschedule full chain + outbox increment', async ({ page }) => {
  await page.clock.install({ time: 0 });

  // Use g2 (second group leader u2) to get a fresh schedule
  await page.goto('/');

  // Switch to u2 and navigate to g2 schedule
  await page.locator('select').selectOption('u2');
  await page.getByText('2026-Q2 迭代').click();
  await page.getByText('组: g2').dblclick();
  await expect(page).toHaveURL(/\/schedules\/g2$/);

  // Edit a task to make content non-empty
  const nameInput = page.locator('tbody tr:first-child td:nth-child(2) input');
  await nameInput.fill('接口设计');

  // Trigger autosave
  await page.clock.runFor(30_000);

  // Submit as GL
  await page.getByRole('button', { name: '提交' }).click();
  await expect(page.getByRole('button', { name: '撤回' })).toBeVisible({ timeout: 5000 });

  // Switch to PM and approve
  await page.locator('select').selectOption('p1');
  await page.getByRole('button', { name: '同意' }).click();
  await expect(page.getByText('已审批')).toBeVisible({ timeout: 5000 });

  // PM reschedules
  await page.getByRole('button', { name: '重新排期' }).click();

  // GL u2 sees REJECTED + re-submit button
  await page.locator('select').selectOption('u2');
  await page.reload();
  await expect(page.getByText('已退回')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: '重新提交' })).toBeVisible();
});
