// tests/burndownChart.test.js
// Unit tests for burndown chart data calculation (BUG-P10)
//
// Key edge cases:
// BUG-P10-01: totalDays=0 (startDate === endDate) → division by zero
// BUG-P10-02: today before startDate → no actual data should be shown
// BUG-P10-03: today after endDate → actual shows 0 remaining
// BUG-P10-04: schedule APPROVED → remaining should be 0

import { describe, it } from 'node:test';
import assert from 'node:assert';

function buildBurndownData(totalTasks, startDate, endDate, scheduleStatus, nowDate) {
  // Replicate burndownChart.js data logic as pure function
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date(nowDate);

  const totalDays = Math.ceil((end - start) / 86400000);
  const totalDaysClamped = totalDays === 0 ? 1 : totalDays; // BUG-P10-01 guard

  // Ideal line: linear from totalTasks to 0
  const idealValues = [];
  for (let i = 0; i <= totalDaysClamped; i++) {
    idealValues.push(totalTasks - (totalTasks * i / totalDaysClamped));
  }

  // Actual line
  const approvedCount = scheduleStatus === 'APPROVED' ? totalTasks : 0;
  const remainingTasks = totalTasks - approvedCount;

  const actualValues = [];
  for (let i = 0; i <= totalDaysClamped; i++) {
    const daysPassed = (i / totalDaysClamped) * totalDays; // real days
    const todayDays = (today - start) / 86400000;

    if (daysPassed <= todayDays) {
      const progress = Math.min(1, Math.max(0, daysPassed / totalDays));
      actualValues.push(totalTasks - Math.round(totalTasks * progress));
    } else {
      actualValues.push(null); // future
    }
  }

  return { idealValues, actualValues, totalDays, remainingTasks };
}

describe('buildBurndownData', () => {
  // BUG-P10-01: single-day iteration (start === end) → should not divide by zero
  it('single day iteration (totalDays=0) → ideal values defined', () => {
    const result = buildBurndownData(5, '2026-04-27', '2026-04-27', 'REVIEWING', '2026-04-27');
    assert.ok(result.idealValues.length > 0, 'idealValues should be populated');
    assert.strictEqual(result.totalDays, 0);
    // First ideal value = totalTasks, last = 0 (clamped to 1 day)
    assert.strictEqual(result.idealValues[0], 5);
  });

  // BUG-P10-02: today before start → actualValues all null (future)
  it('today before startDate → all actual values null', () => {
    const result = buildBurndownData(5, '2026-05-01', '2026-05-10', 'REVIEWING', '2026-04-28');
    assert.ok(result.actualValues.every(v => v === null), 'no actual data before start');
  });

  // BUG-P10-03: today after endDate → remaining = 0
  it('today after endDate → all actual values = remaining (0)', () => {
    const result = buildBurndownData(5, '2026-04-20', '2026-04-25', 'REVIEWING', '2026-05-01');
    assert.ok(result.actualValues.every(v => v !== null), 'all values resolved');
    // After iteration end, remaining should be 0 (approximated by totalTasks - totalTasks)
    assert.strictEqual(result.actualValues[result.actualValues.length - 1], 0);
  });

  // BUG-P10-04: APPROVED schedule → remaining = 0
  it('APPROVED schedule → remainingTasks = 0', () => {
    const result = buildBurndownData(5, '2026-04-20', '2026-04-25', 'APPROVED', '2026-04-27');
    assert.strictEqual(result.remainingTasks, 0);
  });

  it('REVIEWING schedule → remainingTasks = totalTasks', () => {
    const result = buildBurndownData(5, '2026-04-20', '2026-04-25', 'REVIEWING', '2026-04-27');
    assert.strictEqual(result.remainingTasks, 5);
  });

  it('idealValues length = totalDays + 1', () => {
    const result = buildBurndownData(5, '2026-04-27', '2026-04-29', 'REVIEWING', '2026-04-28');
    // Apr 27 to Apr 29 = 2 days, so 3 points (0, 1, 2)
    assert.strictEqual(result.idealValues.length, result.totalDays + 1);
  });

  it('idealValues first = totalTasks, last ≈ 0', () => {
    const result = buildBurndownData(5, '2026-04-27', '2026-04-29', 'REVIEWING', '2026-04-28');
    assert.strictEqual(result.idealValues[0], 5);
    assert.strictEqual(result.idealValues[result.idealValues.length - 1], 0);
  });
});
