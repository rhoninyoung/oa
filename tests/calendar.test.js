// tests/calendar.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isWeekend, isHoliday, isWorkDay, addWorkDays,
  naturalDays, calcEndDate, parseDate
} from '../src/domain/calendar.js';

describe('isWeekend', () => {
  it('Saturday → true', () => { assert.strictEqual(isWeekend('2026-04-25'), true); });
  it('Sunday → true', () => { assert.strictEqual(isWeekend('2026-04-26'), true); });
  it('Monday → false', () => { assert.strictEqual(isWeekend('2026-04-27'), false); });
  it('Friday → false', () => { assert.strictEqual(isWeekend('2026-05-01'), false); });
});

describe('isHoliday', () => {
  it('holiday in list → true', () => { assert.strictEqual(isHoliday('2026-05-01', ['2026-05-01']), true); });
  it('not in list → false', () => { assert.strictEqual(isHoliday('2026-04-27', ['2026-05-01']), false); });
});

describe('isWorkDay', () => {
  it('Mon + no holiday → true', () => { assert.strictEqual(isWorkDay('2026-04-27', []), true); });
  it('Sat + no holiday → false', () => { assert.strictEqual(isWorkDay('2026-04-25', []), false); });
  it('Mon + holiday → false', () => { assert.strictEqual(isWorkDay('2026-05-01', ['2026-05-01']), false); });
});

// DT-CAL-01: addWorkDays(Mon, 1) = Tue
it('addWorkDays: Mon + 1 = Tue', () => {
  assert.strictEqual(addWorkDays('2026-04-27', 1, []), '2026-04-28');
});

// DT-CAL-02: addWorkDays(Fri, 1) = next Mon
it('addWorkDays: Fri + 1 = next Mon', () => {
  assert.strictEqual(addWorkDays('2026-05-01', 1, []), '2026-05-04');
});

// DT-CAL-03: addWorkDays(Fri, 3) = next Wed
it('addWorkDays: Fri + 3 = next Wed', () => {
  assert.strictEqual(addWorkDays('2026-05-01', 3, []), '2026-05-06');
});

// DT-CAL-04: holiday skips correctly
it('addWorkDays: Thu + 2 with Fri holiday = Tue next week', () => {
  assert.strictEqual(addWorkDays('2026-04-30', 2, ['2026-05-01']), '2026-05-05');
});

// DT-CAL-05: duration=0 → same day
it('calcEndDate: duration=0 returns same day', () => {
  assert.strictEqual(calcEndDate('2026-04-27', 0, []), '2026-04-27');
});

describe('calcEndDate', () => {
  // One-day task (duration=1): start Mon → end Mon
  it('duration=1: start Mon → end Mon', () => {
    assert.strictEqual(calcEndDate('2026-04-27', 1, []), '2026-04-27');
  });
  // Two-day task: start Fri → end Mon
  it('duration=2: start Fri → end Mon', () => {
    assert.strictEqual(calcEndDate('2026-05-01', 2, []), '2026-05-04');
  });
});

describe('naturalDays', () => {
  it('same day = 1', () => { assert.strictEqual(naturalDays('2026-04-27', '2026-04-27'), 1); });
  it('Mon→Wed = 3', () => { assert.strictEqual(naturalDays('2026-04-27', '2026-04-29'), 3); });
  it('Fri→Mon (cross weekend) = 4', () => { assert.strictEqual(naturalDays('2026-05-01', '2026-05-04'), 4); });
});

describe('parseDate', () => {
  it('valid YYYY-MM-DD → same string', () => { assert.strictEqual(parseDate('2026-04-27'), '2026-04-27'); });
  it('Date object → YYYY-MM-DD', () => { assert.strictEqual(parseDate(new Date('2026-04-27T00:00:00')), '2026-04-27'); });
  it('null → null', () => { assert.strictEqual(parseDate(null), null); });
  it('bad string → null', () => { assert.strictEqual(parseDate('not-a-date'), null); });
});
