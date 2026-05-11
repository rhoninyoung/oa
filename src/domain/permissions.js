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

  // GL: 对本组可编辑/提交/撤回/增删行；对其他组只读
  if (isGL) {
    if (action === 'read') return { ok: true };
    if (action === 'edit' || action === 'submit' || action === 'withdraw') {
      return isOwnGroup ? { ok: true } : { ok: false, code: 'NOT_OWN_GROUP' };
    }
    if (action === 'approve' || action === 'reject' || action === 'reschedule') {
      return { ok: false, code: 'ACTOR_NOT_PM' };
    }
    if (action === 'addRow') {
      // GL 只能新增本组的行
      return isOwnGroup ? { ok: true } : { ok: false, code: 'NOT_OWN_GROUP' };
    }
    if (action === 'deleteRow') {
      // GL 只能删除本组的行（动态检查由 canDeleteRow 处理）
      return isOwnGroup ? { ok: true } : { ok: false, code: 'NOT_OWN_GROUP' };
    }
  }

  // PM: 可审批/拒绝/重新排期；总表可增删 MASTER 行；可编辑所有组的任务
  if (isPM) {
    if (action === 'read') return { ok: true };
    if (action === 'edit') return { ok: true }; // PM 可编辑所有组的任务
    if (action === 'submit' || action === 'withdraw') {
      return { ok: false, code: 'PM_CANNOT_SUBMIT' };
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
 * @param {object} schedule - { status, groupId }
 * @param {Role} [role] - optional role for permission override
 * @param {object} [user] - { groupId } optional user for GL own-group check
 * @returns {{ok: boolean, code?: string}}
 */
export function canDeleteRow(task, schedule, role, user) {
  if (!task) return { ok: false, code: 'UNKNOWN_SOURCE' };
  // PM can delete any task
  if (role === 'PROJECT_MANAGER') return { ok: true };
  if (task.source === 'MASTER') return { ok: true };
  if (task.source === 'GROUP') {
    // GL can delete in PENDING/REJECTED status for their own group
    if (role === 'GROUP_LEADER' && user) {
      const isOwnGroup = schedule.groupId === user.groupId;
      if (isOwnGroup && (schedule.status === 'PENDING' || schedule.status === 'REJECTED')) {
        return { ok: true };
      }
      return { ok: false, code: 'SYNC_ROW_READONLY', message: '系统同步行不可删除' };
    }
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
 * - PM in GROUP view: can edit ALL GROUP tasks across all groups (自由编辑不限状态)
 */
export function getFieldPermissions(task, schedule, role, user) {
  const isOwnGroup = schedule.groupId === user.groupId;
  const isPM = role === 'PROJECT_MANAGER';
  const isGL = role === 'GROUP_LEADER';

  // MASTER tasks — PM can always edit
  if (task.source === 'MASTER' && isPM) {
    return { ok: true, readonlyFields: null };
  }

  // GROUP tasks
  if (task.source === 'GROUP') {
    if (isPM) {
      // PM can edit all GROUP tasks across all groups
      return { ok: true, readonlyFields: null };
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
