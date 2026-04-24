// tests/stateMachine.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canTransition, nextStatus } from '../src/domain/stateMachine.js';

describe('canTransition', () => {
  const tasks = [{ id: 't1' }];

  // DT-SM-01
  it('PENDING → REVIEWING by GL with tasks → allowed', () => {
    const r = canTransition('PENDING', 'submit', 'GROUP_LEADER', { tasks });
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-02
  it('PENDING → REVIEWING with empty tasks → CONTENT_EMPTY', () => {
    const r = canTransition('PENDING', 'submit', 'GROUP_LEADER', { tasks: [] });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'CONTENT_EMPTY');
  });

  // DT-SM-03
  it('REJECTED → REVIEWING by GL → allowed (re-submit)', () => {
    const r = canTransition('REJECTED', 'submit', 'GROUP_LEADER', { tasks });
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-04
  it('APPROVED → REVIEWING by GL → allowed (re-submit)', () => {
    const r = canTransition('APPROVED', 'submit', 'GROUP_LEADER', { tasks });
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-05
  it('REVIEWING → PENDING by GL (withdraw) → allowed', () => {
    const r = canTransition('REVIEWING', 'withdraw', 'GROUP_LEADER', {});
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-06
  it('REVIEWING → PENDING by PM → ACTOR_NOT_OWNER', () => {
    const r = canTransition('REVIEWING', 'withdraw', 'PROJECT_MANAGER', {});
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'ACTOR_NOT_OWNER');
  });

  // DT-SM-07
  it('REVIEWING → APPROVED by PM → allowed', () => {
    const r = canTransition('REVIEWING', 'approve', 'PROJECT_MANAGER', {});
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-08
  it('REVIEWING → APPROVED by GL → ACTOR_NOT_PM', () => {
    const r = canTransition('REVIEWING', 'approve', 'GROUP_LEADER', {});
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'ACTOR_NOT_PM');
  });

  // DT-SM-09
  it('REVIEWING → REJECTED by PM, reason length in [1,200] → allowed', () => {
    const r = canTransition('REVIEWING', 'reject', 'PROJECT_MANAGER', { reason: '理由充分' });
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-10a
  it('REVIEWING → REJECTED, reason empty → REASON_INVALID', () => {
    const r = canTransition('REVIEWING', 'reject', 'PROJECT_MANAGER', { reason: '' });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'REASON_INVALID');
  });

  // DT-SM-10b
  it('REVIEWING → REJECTED, reason > 200 → REASON_INVALID', () => {
    const r = canTransition('REVIEWING', 'reject', 'PROJECT_MANAGER', { reason: 'A'.repeat(201) });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'REASON_INVALID');
  });

  // DT-SM-11
  it('APPROVED → REJECTED by PM (reschedule) → allowed', () => {
    const r = canTransition('APPROVED', 'reschedule', 'PROJECT_MANAGER', {});
    assert.deepStrictEqual(r, { ok: true });
  });

  // DT-SM-12
  it('PENDING → APPROVED (skip REVIEWING) → INVALID_TRANSITION', () => {
    const r = canTransition('PENDING', 'approve', 'PROJECT_MANAGER', {});
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'INVALID_TRANSITION');
  });
});

describe('nextStatus', () => {
  it('PENDING + submit → REVIEWING', () => { assert.strictEqual(nextStatus('PENDING', 'submit'), 'REVIEWING'); });
  it('REJECTED + submit → REVIEWING', () => { assert.strictEqual(nextStatus('REJECTED', 'submit'), 'REVIEWING'); });
  it('APPROVED + submit → REVIEWING', () => { assert.strictEqual(nextStatus('APPROVED', 'submit'), 'REVIEWING'); });
  it('REVIEWING + withdraw → PENDING', () => { assert.strictEqual(nextStatus('REVIEWING', 'withdraw'), 'PENDING'); });
  it('REVIEWING + approve → APPROVED', () => { assert.strictEqual(nextStatus('REVIEWING', 'approve'), 'APPROVED'); });
  it('REVIEWING + reject → REJECTED', () => { assert.strictEqual(nextStatus('REVIEWING', 'reject'), 'REJECTED'); });
  it('APPROVED + reschedule → REJECTED', () => { assert.strictEqual(nextStatus('APPROVED', 'reschedule'), 'REJECTED'); });
  it('PENDING + approve → null', () => { assert.strictEqual(nextStatus('PENDING', 'approve'), null); });
});
