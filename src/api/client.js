// src/api/client.js
// REST API 客户端 — 所有后端调用的唯一入口
// 模式切换：localStorage.getItem('oa.api.baseUrl') 非空时启用 API 模式

import { canTransition } from '../domain/stateMachine.js';

/**
 * 获取 API Base URL，为空则表示 localStorage 模式
 * @returns {string}
 */
export function getAPIBaseURL() {
  return localStorage.getItem('oa.api.baseUrl') ?? '';
}

export function isAPIMode() {
  return !!getAPIBaseURL();
}

function buildURL(path) {
  return `${getAPIBaseURL()}${path}`;
}

async function request(method, path, body, userId) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(buildURL(path), opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw { status: res.status, ...err };
  }
  return res.json();
}

const get  = (path, userId) => request('GET',    path, undefined, userId);
const post = (path, body, userId) => request('POST',   path, body,   userId);
const patch = (path, body, userId) => request('PATCH',  path, body,   userId);
const del   = (path, userId) => request('DELETE', path, undefined, userId);

// ─── 数据获取 ────────────────────────────────────────────────────────────────

/**
 * 获取完整项目树（含所有嵌套结构）
 * @returns {Promise<object[]>} projects array
 */
export async function fetchProjects() {
  return get('/api/projects', null);
}

/**
 * 获取单个排期详情（含 tasks）
 * @param {string} scheduleId
 * @returns {Promise<object>} schedule with nested tasks
 */
export async function fetchSchedule(scheduleId) {
  return get(`/api/schedules/${scheduleId}`, null);
}

// ─── 扁平化：将后端嵌套结构展平为 state 格式 ──────────────────────────────

/**
 * 将 fetchProjects() 的嵌套响应展平为 state 片段
 * @param {object[]} projects
 * @returns {{ users, groups, projects, iterations, schedules, tasks }}
 */
export function flattenProjectsResponse(projects) {
  const users = [];
  const groups = [];
  const iterations = [];
  const schedules = [];
  const tasks = [];

  // 从 seed 已知 users/groups 不在 projects API 中返回
  // projects API 仅返回项目层级（iterations + schedules + nested tasks）
  // 需要额外调用 /api/schedules/:id 获取每个 schedule 的 tasks

  for (const proj of projects) {
    for (const iter of (proj.iterations ?? [])) {
      iterations.push({
        id: iter.id,
        projectId: proj.id,
        name: iter.name,
        startDate: iter.startDate,
        endDate: iter.endDate,
      });
      for (const sched of (iter.schedules ?? [])) {
        schedules.push({
          id: sched.id,
          iterationId: iter.id,
          groupId: sched.groupId,
          status: sched.status,
          version: sched.version,
          rejectReason: sched.rejectReason ?? null,
        });
      }
    }
  }
  return { users, groups, projects, iterations, schedules, tasks };
}

/**
 * 将 fetchSchedule() 的单条排期响应展平
 * @param {object} schedule - schedule with tasks array
 * @param {string[]} existingGroups - 当前已知的 groups
 * @param {string[]} existingUsers - 当前已知的 users
 * @returns {{ schedules: object[], tasks: object[], users, groups }}
 */
export function flattenScheduleResult(schedule) {
  const tasks = (schedule.tasks ?? []).map(t => ({
    id: t.id,
    scheduleId: t.scheduleId,
    orderIndex: t.orderIndex,
    name: t.name,
    ownerId: t.ownerId ?? null,
    startDate: t.startDate ? t.startDate.slice(0, 10) : null,  // '2026-05-04T00:00:00.000Z' → '2026-05-04'
    endDate: t.endDate ? t.endDate.slice(0, 10) : null,
    durationDays: t.durationDays ?? 1,
    dependencyTaskId: t.dependencyTaskId ?? null,
    source: t.source,
    note: t.note ?? '',
  }));

  return {
    schedules: [{
      id: schedule.id,
      iterationId: schedule.iterationId,
      groupId: schedule.groupId,
      status: schedule.status,
      version: schedule.version,
      rejectReason: schedule.rejectReason ?? null,
    }],
    tasks,
  };
}

/**
 * 批量获取所有 schedule 的 tasks 并展平
 * @param {object[]} schedules
 * @returns {Promise<{ schedules, tasks }>}
 */
export async function fetchAllSchedulesWithTasks(schedules) {
  const scheduleResults = await Promise.all(
    schedules.map(s => fetchSchedule(s.id))
  );

  const allSchedules = [];
  const allTasks = [];

  for (const sched of scheduleResults) {
    const flat = flattenScheduleResult(sched);
    allSchedules.push(...flat.schedules);
    allTasks.push(...flat.tasks);
  }

  return { schedules: allSchedules, tasks: allTasks };
}

// ─── 持久化操作 ────────────────────────────────────────────────────────────

/**
 * 保存草稿（自动保存 / Ctrl+S）
 * @param {string} scheduleId
 * @param {object[]} tasks - task objects from DOM
 * @param {number} version
 * @param {string} userId
 * @returns {Promise<{ok, schedule, newVersion}>}
 */
export async function saveDraft(scheduleId, tasks, version, userId) {
  // 转换日期格式：'2026-05-04' → ISO string
  const payload = tasks.map(t => ({
    name: t.name,
    orderIndex: t.orderIndex,
    ownerId: t.ownerId ?? null,
    startDate: t.startDate ?? null,
    endDate: t.endDate ?? null,
    durationDays: t.durationDays ?? 1,
    dependencyTaskId: t.dependencyTaskId ?? null,
    source: t.source,
    note: t.note ?? '',
  }));

  return patch(`/api/schedules/${scheduleId}/draft`, {
    tasks: payload,
    version,
  }, userId);
}

// ─── 状态转换 ──────────────────────────────────────────────────────────────

/**
 * 提交排期（GL 角色）
 */
export async function submitSchedule(scheduleId, userId) {
  return post(`/api/schedules/${scheduleId}/submit`, undefined, userId);
}

/**
 * 撤回排期（GL 角色）
 */
export async function withdrawSchedule(scheduleId, userId) {
  return post(`/api/schedules/${scheduleId}/withdraw`, undefined, userId);
}

/**
 * 批准排期（PM 角色）
 */
export async function approveSchedule(scheduleId, userId) {
  return post(`/api/schedules/${scheduleId}/approve`, undefined, userId);
}

/**
 * 拒绝排期（PM 角色）
 * @param {string} reason - 拒绝理由（1-200字）
 */
export async function rejectSchedule(scheduleId, reason, userId) {
  return post(`/api/schedules/${scheduleId}/reject`, { reason }, userId);
}

/**
 * 重新排期（PM 角色）
 */
export async function reschedule(scheduleId, userId) {
  return post(`/api/schedules/${scheduleId}/reschedule`, undefined, userId);
}

// ─── 任务操作 ───────────────────────────────────────────────────────────────

/**
 * 插入行
 * @param {string} taskId - 插入到此 taskId 之后（afterIndex = 该任务的 orderIndex）
 */
export async function insertRow(scheduleId, afterIndex, userId) {
  return post(`/api/tasks/${scheduleId}/rows`, { afterIndex }, userId);
}

/**
 * 删除行
 */
export async function deleteRow(taskId, userId) {
  return del(`/api/tasks/${taskId}`, userId);
}

/**
 * 设置依赖
 * @param {string} taskId
 * @param {string|null} dependencyTaskId
 */
export async function setDependency(taskId, dependencyTaskId, userId) {
  return patch(`/api/tasks/${taskId}/dependency`, { dependencyTaskId }, userId);
}

/**
 * 触发时间联动传播
 */
export async function propagateTask(taskId, userId) {
  return post(`/api/tasks/${taskId}/propagate`, undefined, userId);
}

// ─── 总表操作 ───────────────────────────────────────────────────────────────

/**
 * 获取总表视图
 * @param {string} iterationId
 * @returns {Promise<object[]>} tasks array with scheduleStatus/groupId
 */
export async function fetchMasterView(iterationId) {
  return get(`/api/master/${iterationId}`, null);
}

/**
 * PM 新增总表行
 * @param {string} iterationId
 * @param {string} scheduleId
 * @param {object} taskData - { name, ownerId, startDate, endDate, durationDays }
 */
export async function addMasterRow(iterationId, scheduleId, taskData, userId) {
  return post(`/api/master/${iterationId}/rows`, { scheduleId, ...taskData }, userId);
}

/**
 * PM 删除总表行
 */
export async function deleteMasterRow(taskId, userId) {
  return del(`/api/master/rows/${taskId}`, userId);
}
