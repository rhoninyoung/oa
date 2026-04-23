import { permissions } from './permissions.js';

describe('permissions', () => {
  // ── DT-PERM-01: GL对本组schedule ─────────────────────────────────────────────
  describe('DT-PERM-01: GL对本组schedule', () => {
    const ctx = { type: 'schedule' as const, groupId: 'g1', ownGroup: true };

    it('edit → allow', () => {
      expect(permissions('GROUP_LEADER', ctx, 'edit')).toEqual({ allowed: true });
    });
    it('submit → allow', () => {
      expect(permissions('GROUP_LEADER', ctx, 'submit')).toEqual({ allowed: true });
    });
    it('withdraw → allow', () => {
      expect(permissions('GROUP_LEADER', ctx, 'withdraw')).toEqual({ allowed: true });
    });
    it('approve → deny, ACTOR_NOT_PM', () => {
      expect(permissions('GROUP_LEADER', ctx, 'approve')).toMatchObject({
        allowed: false,
        code: 'ACTOR_NOT_PM',
      });
    });
  });

  // ── DT-PERM-02: GL对非本组schedule ───────────────────────────────────────────
  describe('DT-PERM-02: GL对非本组schedule', () => {
    const ctx = { type: 'schedule' as const, groupId: 'g2', ownGroup: false };

    it('read → allow', () => {
      expect(permissions('GROUP_LEADER', ctx, 'read')).toEqual({ allowed: true });
    });
    it('edit → deny', () => {
      expect(permissions('GROUP_LEADER', ctx, 'edit')).toMatchObject({
        allowed: false,
        code: 'ACTOR_NOT_OWNER',
      });
    });
  });

  // ── DT-PERM-03: PM对任意schedule ─────────────────────────────────────────────
  describe('DT-PERM-03: PM对任意schedule', () => {
    const ctx = { type: 'schedule' as const, groupId: 'g1', ownGroup: false };

    it('read → allow', () => {
      expect(permissions('PROJECT_MANAGER', ctx, 'read')).toEqual({ allowed: true });
    });
    it('approve/reject/reschedule → allow', () => {
      expect(permissions('PROJECT_MANAGER', ctx, 'approve')).toEqual({ allowed: true });
      expect(permissions('PROJECT_MANAGER', ctx, 'reject')).toEqual({ allowed: true });
      expect(permissions('PROJECT_MANAGER', ctx, 'reschedule')).toEqual({ allowed: true });
    });
    it('direct task field edit → deny', () => {
      expect(permissions('PROJECT_MANAGER', ctx, 'edit')).toMatchObject({
        allowed: false,
        code: 'ACTOR_NOT_OWNER',
      });
    });
  });

  // ── DT-PERM-04: PM对master ────────────────────────────────────────────────────
  describe('DT-PERM-04: PM对master', () => {
    it('addRow → allow', () => {
      const ctx = { type: 'master' as const, groupId: 'g1', ownGroup: false };
      expect(permissions('PROJECT_MANAGER', ctx, 'addRow')).toEqual({ allowed: true });
    });
    it('deleteRow, source=MASTER → allow', () => {
      const ctx = { type: 'master' as const, groupId: 'g1', ownGroup: false, taskSource: 'MASTER' as const };
      expect(permissions('PROJECT_MANAGER', ctx, 'deleteRow')).toEqual({ allowed: true });
    });
    it('deleteRow, source=GROUP → deny', () => {
      const ctx = { type: 'master' as const, groupId: 'g1', ownGroup: false, taskSource: 'GROUP' as const };
      expect(permissions('PROJECT_MANAGER', ctx, 'deleteRow')).toMatchObject({
        allowed: false,
        code: 'SYNC_ROW_READONLY',
      });
    });
  });
});
