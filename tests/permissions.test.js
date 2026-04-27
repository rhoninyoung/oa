// tests/permissions.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { permit, canDeleteRow } from '../src/domain/permissions.js';

const glUser = { id: 'u1', groupId: 'g1' };
const pmUser = { id: 'pm1', groupId: null };
const ownSchedule = { groupId: 'g1' };
const otherSchedule = { groupId: 'g2' };

describe('permit', () => {
  // DT-PERM-01
  it('GL: edit/submit/withdraw on own group → allowed', () => {
    for (const a of ['edit', 'submit', 'withdraw']) {
      assert.deepStrictEqual(permit('GROUP_LEADER', 'u1', ownSchedule, glUser, a), { ok: true }, a);
    }
  });
  it('GL: approve on own group → denied', () => {
    assert.strictEqual(permit('GROUP_LEADER', 'u1', ownSchedule, glUser, 'approve').ok, false);
  });

  // DT-PERM-02
  it('GL: edit on other group → NOT_OWN_GROUP', () => {
    assert.strictEqual(permit('GROUP_LEADER', 'u1', otherSchedule, glUser, 'edit').code, 'NOT_OWN_GROUP');
  });
  it('GL: read on other group → allowed', () => {
    assert.deepStrictEqual(permit('GROUP_LEADER', 'u1', otherSchedule, glUser, 'read'), { ok: true });
  });

  // DT-PERM-03
  it('PM: read/approve/reject/reschedule → allowed', () => {
    for (const a of ['read', 'approve', 'reject', 'reschedule']) {
      assert.deepStrictEqual(permit('PROJECT_MANAGER', 'pm1', ownSchedule, pmUser, a), { ok: true }, a);
    }
  });
  it('PM: edit tasks directly → denied', () => {
    assert.strictEqual(permit('PROJECT_MANAGER', 'pm1', ownSchedule, pmUser, 'edit').code, 'PM_CANNOT_EDIT_DIRECTLY');
  });

  // DT-PERM-04
  it('PM: addRow → allowed (master)', () => {
    assert.deepStrictEqual(permit('PROJECT_MANAGER', 'pm1', ownSchedule, pmUser, 'addRow'), { ok: true });
  });
});

describe('canDeleteRow', () => {
  it('source=MASTER → always allowed', () => {
    assert.deepStrictEqual(canDeleteRow({ source: 'MASTER' }, { status: 'PENDING' }), { ok: true });
    assert.deepStrictEqual(canDeleteRow({ source: 'MASTER' }, { status: 'APPROVED' }), { ok: true });
  });
  it('source=GROUP + PENDING/REJECTED → allowed', () => {
    for (const s of ['PENDING', 'REJECTED']) {
      assert.deepStrictEqual(canDeleteRow({ source: 'GROUP' }, { status: s }), { ok: true }, s);
    }
  });
  it('source=GROUP + REVIEWING/APPROVED → SYNC_ROW_READONLY', () => {
    for (const s of ['REVIEWING', 'APPROVED']) {
      assert.strictEqual(canDeleteRow({ source: 'GROUP' }, { status: s }).code, 'SYNC_ROW_READONLY', s);
    }
  });
  // DT-PERM-05: null task → UNKNOWN_SOURCE
  it('canDeleteRow: task is null → UNKNOWN_SOURCE', () => {
    assert.strictEqual(canDeleteRow(null, { status: 'PENDING' }).code, 'UNKNOWN_SOURCE');
  });
});

describe('permit: deleteRow action', () => {
  // DT-PERM-06: GL on own group + deleteRow → MASTER_ONLY
  it('GL: deleteRow → MASTER_ONLY (not allowed)', () => {
    assert.strictEqual(permit('GROUP_LEADER', 'u1', ownSchedule, glUser, 'deleteRow').code, 'MASTER_ONLY');
  });
  // DT-PERM-07: PM + deleteRow → allowed (source-level check is in canDeleteRow)
  it('PM: deleteRow → allowed', () => {
    assert.deepStrictEqual(permit('PROJECT_MANAGER', 'pm1', ownSchedule, pmUser, 'deleteRow'), { ok: true });
  });
  // DT-PERM-08: GL + reschedule → ACTOR_NOT_PM
  it('GL: reschedule → ACTOR_NOT_PM', () => {
    assert.strictEqual(permit('GROUP_LEADER', 'u1', ownSchedule, glUser, 'reschedule').code, 'ACTOR_NOT_PM');
  });
});
