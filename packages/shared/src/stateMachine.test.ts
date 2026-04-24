import { canTransition } from './stateMachine.js';
import type {} from './types.js';

describe('canTransition', () => {
  // ── DT-SM-01: PENDING → REVIEWING by GL, tasks non-empty → allowed ──────────
  it('DT-SM-01: PENDING → REVIEWING by GL, non-empty tasks → allowed', () => {
    const result = canTransition('PENDING', 'REVIEWING', 'GROUP_LEADER', {
      tasksNonEmpty: true,
    });
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-02: PENDING → REVIEWING, empty tasks → CONTENT_EMPTY ──────────────
  it('DT-SM-02: PENDING → REVIEWING, empty tasks → CONTENT_EMPTY', () => {
    const result = canTransition('PENDING', 'REVIEWING', 'GROUP_LEADER', {
      tasksNonEmpty: false,
    });
    expect(result).toMatchObject({ ok: false, code: 'CONTENT_EMPTY' });
  });

  // ── DT-SM-03: REJECTED → REVIEWING by GL → allowed ─────────────────────────
  it('DT-SM-03: REJECTED → REVIEWING by GL → allowed (resubmit)', () => {
    const result = canTransition('REJECTED', 'REVIEWING', 'GROUP_LEADER', {
      tasksNonEmpty: true,
    });
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-04: APPROVED → REVIEWING by GL → allowed ────────────────────────
  it('DT-SM-04: APPROVED → REVIEWING by GL → allowed (re-submit)', () => {
    const result = canTransition('APPROVED', 'REVIEWING', 'GROUP_LEADER', {
      tasksNonEmpty: true,
    });
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-05: REVIEWING → PENDING by GL (withdraw) → allowed ──────────────
  it('DT-SM-05: REVIEWING → PENDING by GL (withdraw) → allowed', () => {
    const result = canTransition('REVIEWING', 'PENDING', 'GROUP_LEADER', {});
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-06: REVIEWING → PENDING by PM → ACTOR_NOT_OWNER ─────────────────
  it('DT-SM-06: REVIEWING → PENDING by PM → ACTOR_NOT_OWNER', () => {
    const result = canTransition('REVIEWING', 'PENDING', 'PROJECT_MANAGER', {});
    expect(result).toMatchObject({ ok: false, code: 'ACTOR_NOT_OWNER' });
  });

  // ── DT-SM-07: REVIEWING → APPROVED by PM → allowed ─────────────────────────
  it('DT-SM-07: REVIEWING → APPROVED by PM → allowed', () => {
    const result = canTransition('REVIEWING', 'APPROVED', 'PROJECT_MANAGER', {});
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-08: REVIEWING → APPROVED by GL → ACTOR_NOT_PM ───────────────────
  it('DT-SM-08: REVIEWING → APPROVED by GL → ACTOR_NOT_PM', () => {
    const result = canTransition('REVIEWING', 'APPROVED', 'GROUP_LEADER', {});
    expect(result).toMatchObject({ ok: false, code: 'ACTOR_NOT_PM' });
  });

  // ── DT-SM-09: REVIEWING → REJECTED by PM, reason 1-200 → allowed ──────────
  it('DT-SM-09: REVIEWING → REJECTED by PM, reason in [1,200] → allowed', () => {
    const result = canTransition('REVIEWING', 'REJECTED', 'PROJECT_MANAGER', {
      rejectReason: '需求不合理',
    });
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-10: REVIEWING → REJECTED, reason empty → REASON_INVALID ─────────
  it('DT-SM-10: REVIEWING → REJECTED, empty reason → REASON_INVALID', () => {
    const result = canTransition('REVIEWING', 'REJECTED', 'PROJECT_MANAGER', {
      rejectReason: '',
    });
    expect(result).toMatchObject({ ok: false, code: 'REASON_INVALID' });
  });

  it('DT-SM-10b: REVIEWING → REJECTED, reason > 200 chars → REASON_INVALID', () => {
    const long = 'a'.repeat(201);
    const result = canTransition('REVIEWING', 'REJECTED', 'PROJECT_MANAGER', {
      rejectReason: long,
    });
    expect(result).toMatchObject({ ok: false, code: 'REASON_INVALID' });
  });

  // ── DT-SM-11: APPROVED → REJECTED by PM (reschedule) → allowed ────────────
  it('DT-SM-11: APPROVED → REJECTED by PM (reschedule) → allowed', () => {
    const result = canTransition('APPROVED', 'REJECTED', 'PROJECT_MANAGER', {});
    expect(result).toEqual({ ok: true });
  });

  // ── DT-SM-12: PENDING → APPROVED (skip REVIEWING) → INVALID_TRANSITION ────
  it('DT-SM-12: PENDING → APPROVED (skip REVIEWING) → INVALID_TRANSITION', () => {
    const result = canTransition('PENDING', 'APPROVED', 'PROJECT_MANAGER', {});
    expect(result).toMatchObject({ ok: false, code: 'INVALID_TRANSITION' });
  });
});
