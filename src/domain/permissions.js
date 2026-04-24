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
  if (task.source === 'MASTER') return { ok: true };
  if (task.source === 'GROUP') {
    if (schedule.status === 'PENDING' || schedule.status === 'REJECTED') return { ok: true };
    return { ok: false, code: 'SYNC_ROW_READONLY', message: '系统同步行不可删除' };
  }
  return { ok: false, code: 'UNKNOWN_SOURCE' };
}
