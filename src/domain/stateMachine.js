// src/domain/stateMachine.js
// 状态机纯函数 — 参照 PLAN.md §6 状态机真值表

/**
 * @typedef {'PENDING'|'REVIEWING'|'APPROVED'|'REJECTED'} ScheduleStatus
 * @typedef {'GROUP_LEADER'|'PROJECT_MANAGER'} Role
 * @typedef {'submit'|'withdraw'|'approve'|'reject'|'reschedule'} Action
 */

/**
 * @param {ScheduleStatus} from
 * @param {Action} action
 * @param {Role} actor
 * @param {{tasks: any[], reason?: string}} ctx
 * @returns {{ok: boolean, code?: string, message?: string}}
 */
export function canTransition(from, action, actor, ctx = {}) {
  const { tasks = [], reason = '' } = ctx;

  switch (from) {
    case 'PENDING':
      if (action === 'submit') {
        if (!tasks || tasks.length === 0) {
          return { ok: false, code: 'CONTENT_EMPTY', message: '任务列表为空，无法提交' };
        }
        if (actor !== 'GROUP_LEADER') {
          return { ok: false, code: 'ACTOR_NOT_OWNER', message: '只有组长可以提交' };
        }
        return { ok: true };
      }
      break;

    case 'REJECTED':
      if (action === 'submit') {
        if (!tasks || tasks.length === 0) {
          return { ok: false, code: 'CONTENT_EMPTY', message: '任务列表为空，无法提交' };
        }
        if (actor !== 'GROUP_LEADER') {
          return { ok: false, code: 'ACTOR_NOT_OWNER', message: '只有组长可以提交' };
        }
        return { ok: true };
      }
      break;

    case 'APPROVED':
      if (action === 'submit') {
        if (!tasks || tasks.length === 0) {
          return { ok: false, code: 'CONTENT_EMPTY', message: '任务列表为空，无法提交' };
        }
        if (actor !== 'GROUP_LEADER') {
          return { ok: false, code: 'ACTOR_NOT_OWNER', message: '只有组长可以提交' };
        }
        return { ok: true };
      }
      if (action === 'reschedule') {
        if (actor !== 'PROJECT_MANAGER') {
          return { ok: false, code: 'ACTOR_NOT_PM', message: '只有 PM 可以重新排期' };
        }
        return { ok: true };
      }
      break;

    case 'REVIEWING':
      if (action === 'withdraw') {
        if (actor !== 'GROUP_LEADER') {
          return { ok: false, code: 'ACTOR_NOT_OWNER', message: '只有组长可以撤回' };
        }
        return { ok: true };
      }
      if (action === 'approve') {
        if (actor !== 'PROJECT_MANAGER') {
          return { ok: false, code: 'ACTOR_NOT_PM', message: '只有 PM 可以审批' };
        }
        return { ok: true };
      }
      if (action === 'reject') {
        if (actor !== 'PROJECT_MANAGER') {
          return { ok: false, code: 'ACTOR_NOT_PM', message: '只有 PM 可以拒绝' };
        }
        const r = reason ?? '';
        if (r.length === 0) {
          return { ok: false, code: 'REASON_INVALID', message: '拒绝理由不能为空' };
        }
        if (r.length > 200) {
          return { ok: false, code: 'REASON_INVALID', message: '拒绝理由不能超过 200 字' };
        }
        return { ok: true };
      }
      break;
  }

  return { ok: false, code: 'INVALID_TRANSITION', message: `状态 ${from} 不允许执行 ${action}` };
}

/**
 * @param {ScheduleStatus} from
 * @param {Action} action
 * @returns {ScheduleStatus | null}
 */
export function nextStatus(from, action) {
  const map = {
    'PENDING|submit': 'REVIEWING',
    'REJECTED|submit': 'REVIEWING',
    'APPROVED|submit': 'REVIEWING',
    'REVIEWING|withdraw': 'PENDING',
    'REVIEWING|approve': 'APPROVED',
    'REVIEWING|reject': 'REJECTED',
    'APPROVED|reschedule': 'REJECTED',
  };
  return map[`${from}|${action}`] ?? null;
}
