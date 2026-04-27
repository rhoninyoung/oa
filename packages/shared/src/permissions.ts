// packages/shared/src/permissions.ts
// 权限矩阵纯函数 — 参照 PLAN.md §4 权限矩阵

import type { Role, Task, GroupSchedule } from './types.js';

export interface PermissionResult {
  ok: boolean;
  code?: string;
  message?: string;
}

export interface ScheduleInfo {
  groupId: string;
}

export interface UserInfo {
  groupId: string | null;
}

export type PermissionAction =
  | 'read'
  | 'edit'
  | 'submit'
  | 'withdraw'
  | 'approve'
  | 'reject'
  | 'reschedule'
  | 'addRow'
  | 'deleteRow';

/**
 * Check if a role can perform an action on a schedule
 * @param role - User role
 * @param userId - User ID (unused in current implementation)
 * @param schedule - Schedule info
 * @param user - User info
 * @param action - Action to check
 * @returns PermissionResult
 */
export function permit(
  role: Role,
  userId: string,
  schedule: ScheduleInfo,
  user: UserInfo,
  action: PermissionAction,
): PermissionResult {
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
      return { ok: true };
    }
  }

  return { ok: false, code: 'UNKNOWN_ACTION' };
}

/**
 * Check if a row (task) can be deleted
 * @param task - Task to check (can be null)
 * @param schedule - Schedule info
 * @returns PermissionResult
 */
export function canDeleteRow(task: Task | null, schedule: { status: string }): PermissionResult {
  if (!task) return { ok: false, code: 'UNKNOWN_SOURCE' };
  if (task.source === 'MASTER') return { ok: true };
  if (task.source === 'GROUP') {
    if (schedule.status === 'PENDING' || schedule.status === 'REJECTED') return { ok: true };
    return { ok: false, code: 'SYNC_ROW_READONLY', message: '系统同步行不可删除' };
  }
  return { ok: false, code: 'UNKNOWN_SOURCE' };
}
