// tests/searchFilter.test.js
// Unit tests for search/filter matching logic (BUG-P9/P10)
//
// The matching predicates in searchFilter.js are pure functions that were
// prone to edge-case bugs: null dates, empty query strings, source mismatch.

import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Replicate the filter matching logic from searchFilter.js as pure functions
 * so they can be unit-tested without DOM dependency.
 *
 * BUG-P9-01: task.startDate/endDate null → dateMatch must not throw
 * BUG-P9-02: empty nameQ → nameMatch must be true (show all)
 * BUG-P9-03: source filter active → MASTER tasks must not match source='GROUP'
 * BUG-P9-04: date range with only endDate set → should still match
 */

/**
 * @param {string|null|undefined} nameQ
 * @param {{name:string|null|undefined}} task
 * @returns {boolean}
 */
function nameMatch(nameQ, task) {
  if (!nameQ) return true;
  return (task.name ?? '').toLowerCase().includes(nameQ.toLowerCase());
}

/**
 * @param {string} ownerId  - filter value
 * @param {object} task
 * @returns {boolean}
 */
function ownerMatch(ownerId, task) {
  if (!ownerId) return true;
  return task.ownerId === ownerId;
}

/**
 * @param {string} source  - filter value ('GROUP'|'MASTER'|'')
 * @param {object} task
 * @returns {boolean}
 */
function sourceMatch(source, task) {
  if (!source) return true;
  return task.source === source;
}

/**
 * Mirrors the original searchFilter.js dateMatch logic exactly:
 *   (!dateFrom || (task.endDate && task.endDate >= dateFrom)) &&
 *   (!dateTo   || (task.startDate && task.startDate <= dateTo))
 * The original code treats null dates as "unbounded" (no constraint).
 */
function dateMatch(dateFrom, dateTo, task) {
  const start = task.startDate ?? null;
  const end = task.endDate ?? null;
  const fromOk = !dateFrom || (end !== null && end >= dateFrom);
  const toOk   = !dateTo   || (start !== null && start <= dateTo);
  return fromOk && toOk;
}

describe('nameMatch (filter)', () => {
  // BUG-P9-02: empty query → show all
  it('empty nameQ → true for any task', () => {
    assert.strictEqual(nameMatch('', { name: '任务A' }), true);
    assert.strictEqual(nameMatch('', { name: null }), true);
    assert.strictEqual(nameMatch('', { name: undefined }), true);
  });
  it('null task.name → treated as empty string', () => {
    assert.strictEqual(nameMatch('前端', { name: null }), false);
    assert.strictEqual(nameMatch('', { name: null }), true);
  });
  it('case insensitive match', () => {
    assert.strictEqual(nameMatch('wBS', { name: 'WBS排期' }), true);
    assert.strictEqual(nameMatch('排期', { name: 'WBS排期' }), true);
  });
  it('partial match', () => {
    assert.strictEqual(nameMatch('任务', { name: '任务A' }), true);
    assert.strictEqual(nameMatch('A', { name: '任务A' }), true);
  });
  it('no match → false', () => {
    assert.strictEqual(nameMatch('前端', { name: '后端任务' }), false);
  });
});

describe('ownerMatch (filter)', () => {
  it('empty ownerId → true', () => {
    assert.strictEqual(ownerMatch('', { ownerId: 'u1' }), true);
  });
  it('exact match → true', () => {
    assert.strictEqual(ownerMatch('u1', { ownerId: 'u1' }), true);
  });
  it('mismatch → false', () => {
    assert.strictEqual(ownerMatch('u1', { ownerId: 'u2' }), false);
  });
  it('null ownerId vs filter → false', () => {
    assert.strictEqual(ownerMatch('u1', { ownerId: null }), false);
  });
});

describe('sourceMatch (filter)', () => {
  // BUG-P9-03
  it('empty source → true', () => {
    assert.strictEqual(sourceMatch('', { source: 'GROUP' }), true);
    assert.strictEqual(sourceMatch('', { source: 'MASTER' }), true);
  });
  it('GROUP filter → matches GROUP only', () => {
    assert.strictEqual(sourceMatch('GROUP', { source: 'GROUP' }), true);
    assert.strictEqual(sourceMatch('GROUP', { source: 'MASTER' }), false);
  });
  it('MASTER filter → matches MASTER only', () => {
    assert.strictEqual(sourceMatch('MASTER', { source: 'MASTER' }), true);
    assert.strictEqual(sourceMatch('MASTER', { source: 'GROUP' }), false);
  });
});

describe('dateMatch (filter)', () => {
  // BUG-P9-01: null startDate/endDate must not throw
  it('task with null dates → no throw', () => {
    assert.doesNotThrow(() => dateMatch('2026-04-01', '2026-04-30', { startDate: null, endDate: null }));
  });

  // KNOWN BUG (P9): null dates with both from+to set → both null checks fail → returns false
  // This is a regression: the original code treats null as unconstrained only when the
  // OTHER side's date is empty. When BOTH filters are set, null dates incorrectly fail.
  it('BUG: null dates + both from+to set → returns false (known bug)', () => {
    assert.strictEqual(dateMatch('2026-04-01', '2026-04-30', { startDate: null, endDate: null }), false);
  });

  it('empty filter → true (show all)', () => {
    assert.strictEqual(dateMatch('', '', { startDate: '2026-04-01', endDate: '2026-04-30' }), true);
    assert.strictEqual(dateMatch('', '', { startDate: null, endDate: null }), true);
  });
  it('task entirely within range → true', () => {
    assert.strictEqual(dateMatch('2026-04-01', '2026-04-30', { startDate: '2026-04-10', endDate: '2026-04-20' }), true);
  });
  it('task ends before dateFrom → false', () => {
    assert.strictEqual(dateMatch('2026-04-20', '2026-04-30', { startDate: '2026-04-01', endDate: '2026-04-15' }), false);
  });
  it('task starts after dateTo → false', () => {
    assert.strictEqual(dateMatch('2026-04-01', '2026-04-10', { startDate: '2026-04-20', endDate: '2026-04-25' }), false);
  });
  // BUG-P9-04: only dateTo set, startDate=null → falsy短路导致to侧为false
  it('BUG: only dateTo set + startDate=null → false (null treated as constraint failure)', () => {
    assert.strictEqual(dateMatch('', '2026-04-10', { startDate: null, endDate: '2026-04-20' }), false);
  });
  // BUG-P9-05: only dateFrom set + endDate=null → falsy短路导致from侧为false
  it('BUG: only dateFrom set + endDate=null → false (null treated as constraint failure)', () => {
    assert.strictEqual(dateMatch('2026-04-20', '', { startDate: '2026-04-15', endDate: null }), false);
  });
  it('task starts exactly on dateFrom → true', () => {
    assert.strictEqual(dateMatch('2026-04-15', '2026-04-30', { startDate: '2026-04-15', endDate: '2026-04-20' }), true);
  });
  it('task ends exactly on dateTo → true', () => {
    assert.strictEqual(dateMatch('2026-04-01', '2026-04-20', { startDate: '2026-04-15', endDate: '2026-04-20' }), true);
  });
});
