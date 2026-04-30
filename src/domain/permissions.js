// src/domain/permissions.js
// 权限矩阵纯函数 — 参照 PLAN.md §4 权限矩阵

/**
 * @typedef {'GROUP_LEADER'|'PROJECT_MANAGER'} Role
 * @typedef {'GROUP'|'MASTER'} ViewMode
 */

/**
 * @param {Role} role
 * @param {string} userId
 * @param {object} schedule  - { groupId }
 * @param {object} user     - { groupId }
 * @param {'read'|'edit'|'submit'|'withdraw'|'approve'|'reject'|'reschedule'|'addRow'|'deleteRow'} action
 * @returns {{ok: boolean, code?: string}}
 */
export function permit(role, userId, schedule, user, action) {
  const isGL = role === 'GROUP_LEADER';
  const isPM = role === 'PROJECT_MANAGER';
  const isOwnGroup = schedule.groupId === user.groupId;

  // GL: 对本组可编辑/提交/撤回；对其他组只读
  if (isGL) {
    if (action === 'read') return { ok: true };
    if (action === 'edit' || action === 'submit' || action === 'withdraw') {
      return isOwnGroup ? { ok: true } : { ok: false, code: 'NOT_OWN_GROUP' };
    }
    if (action === 'approve' || action === 'reject' || action === 'reschedule') {
      return { ok: false, code: 'ACTOR_NOT_PM' };
    }
    if (action === 'addRow') {
      return { ok: false, code: 'MASTER_ONLY' };
    }
    if (action === 'deleteRow') {
      return { ok: false, code: 'MASTER_ONLY' };
    }
  }

  // PM: 对所有组只读任务，可审批/拒绝/重新排期；总表可增删 MASTER 行
  if (isPM) {
    if (action === 'read') return { ok: true };
    if (action === 'edit' || action === 'submit' || action === 'withdraw') {
      return { ok: false, code: 'PM_CANNOT_EDIT_DIRECTLY' };
    }
    if (action === 'approve' || action === 'reject' || action === 'reschedule') {
      return { ok: true };
    }
    if (action === 'addRow') return { ok: true };
    if (action === 'deleteRow') {
      // 动态检查由调用方通过 canDeleteRow 判断 source
      return { ok: true };
    }
  }

  return { ok: false, code: 'UNKNOWN_ACTION' };
}

/**
 * @param {object} task  - { source, schedule }
 * @param {object} schedule - { status }
 * @returns {{ok: boolean, code?: string}}
 */
export function canDeleteRow(task, schedule) {
  if (!task) return { ok: false, code: 'UNKNOWN_SOURCE' };
  if (task.source === 'MASTER') return { ok: true };
  if (task.source === 'GROUP') {
    if (schedule.status === 'PENDING' || schedule.status === 'REJECTED') return { ok: true };
    return { ok: false, code: 'SYNC_ROW_READONLY', message: '系统同步行不可删除' };
  }
  return { ok: false, code: 'UNKNOWN_SOURCE' };
}

/**
 * Field-level edit permissions per task/schedule/role context.
 * Returns a Set of editable field names, or null if all fields editable.
 *
 * @param {object} task - { source }
 * @param {object} schedule - { status, groupId }
 * @param {Role} role
 * @param {object} user - { groupId }
 * @returns {{ok: boolean, readonlyFields?: Set<string>}}
 *
 * Rules (per PDF §9 字段级权限):
 * - REVIEWING status: GL cannot edit any task fields (readonly all)
 * - APPROVED status: GL cannot edit any task fields
 * - PENDING/REJECTED: GL can edit GROUP tasks in their own group
 * - PM in MASTER view: can edit MASTER tasks
 * - PM in GROUP view: read-only (use MASTER view to edit)
 */
export function getFieldPermissions(task, schedule, role, user) {
  const isOwnGroup = schedule.groupId === user.groupId;
  const isPM = role === 'PROJECT_MANAGER';
  const isGL = role === 'GROUP_LEADER';

  // PM in GROUP view (not MASTER view) — all fields read-only
  if (isPM && task.source === 'GROUP') {
    return { ok: true, readonlyFields: new Set(['name', 'ownerId', 'startDate', 'endDate', 'durationDays', 'dependencyTaskId', 'note', 'progressPercent']) };
  }

  // MASTER tasks — PM can always edit
  if (task.source === 'MASTER' && isPM) {
    return { ok: true, readonlyFields: null };
  }

  // GROUP tasks
  if (task.source === 'GROUP') {
    if (isPM) {
      // PM sees GROUP tasks as read-only in GROUP view
      return { ok: true, readonlyFields: new Set(['name', 'ownerId', 'startDate', 'endDate', 'durationDays', 'dependencyTaskId', 'note', 'progressPercent']) };
    }

    if (isGL) {
      if (!isOwnGroup) {
        // GL viewing another group's schedule — all read-only
        return { ok: true, readonlyFields: new Set(['name', 'ownerId', 'startDate', 'endDate', 'durationDays', 'dependencyTaskId', 'note', 'progressPercent']) };
      }
      if (schedule.status === 'REVIEWING' || schedule.status === 'APPROVED') {
        // REVIEWING/APPROVED: GL cannot edit fields while under review
        return { ok: true, readonlyFields: new Set(['name', 'ownerId', 'startDate', 'endDate', 'durationDays', 'dependencyTaskId', 'note', 'progressPercent']) };
      }
      // PENDING/REJECTED: GL can edit
      return { ok: true, readonlyFields: null };
    }
  }

  return { ok: true, readonlyFields: null };
}
