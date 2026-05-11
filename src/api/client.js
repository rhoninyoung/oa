// src/api/client.js
// REST API 客户端 — 纯 API 模式，无 localStorage
// 所有请求通过 nginx 反向代理到后端（BASE = /api）

const BASE = '/api';

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
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw { status: res.status, ...err };
  }
  return res.json();
}

const get   = (path, userId) => request('GET',    path, undefined, userId);
const post  = (path, body, userId) => request('POST',   path, body,   userId);
const patch = (path, body, userId) => request('PATCH',  path, body,   userId);
const del   = (path, userId) => request('DELETE', path, undefined, userId);

// ─── 初始化 ─────────────────────────────────────────────────────────────────

/**
 * Normalize Prisma DateTime objects to YYYY-MM-DD strings
 * Prisma returns Date objects that serialize to ISO strings like "2026-05-04T00:00:00.000Z"
 */
function normalizeDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    // Already a string - check if it's ISO format with time component
    if (dateVal.includes('T')) {
      return dateVal.slice(0, 10);
    }
    return dateVal;
  }
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return dateVal;
}

function normalizeTask(task) {
  return {
    ...task,
    startDate: normalizeDate(task.startDate),
    endDate: normalizeDate(task.endDate),
  };
}

function normalizeIteration(iter) {
  return {
    ...iter,
    startDate: normalizeDate(iter.startDate),
    endDate: normalizeDate(iter.endDate),
  };
}

/**
 * 获取完整初始化数据（替代原来的 fetchProjects + fetchAllSchedulesWithTasks）
 */
export async function fetchInitData(userId) {
  const data = await get(`/init?userId=${encodeURIComponent(userId)}`, userId);

  // Normalize all date fields from Prisma DateTime to YYYY-MM-DD
  return {
    ...data,
    iterations: (data.iterations ?? []).map(normalizeIteration),
    tasks: (data.tasks ?? []).map(normalizeTask),
  };
}

// ─── 数据获取 ────────────────────────────────────────────────────────────────

export async function fetchProjects() {
  return get('/projects', null);
}

export async function fetchSchedule(scheduleId) {
  return get(`/schedules/${scheduleId}`, null);
}

// ─── 扁平化 ────────────────────────────────────────────────────────────────

export function flattenProjectsResponse(projects) {
  const users = [];
  const groups = [];
  const iterations = [];
  const schedules = [];
  const tasks = [];

  for (const proj of projects) {
    for (const iter of (proj.iterations ?? [])) {
      iterations.push({
        id: iter.id, projectId: proj.id,
        name: iter.name,
        startDate: iter.startDate, endDate: iter.endDate,
      });
      for (const sched of (iter.schedules ?? [])) {
        schedules.push({
          id: sched.id, iterationId: iter.id, groupId: sched.groupId,
          status: sched.status, version: sched.version, rejectReason: sched.rejectReason ?? null,
        });
      }
    }
  }
  return { users, groups, projects, iterations, schedules, tasks };
}

export function flattenScheduleResult(schedule) {
  const tasks = (schedule.tasks ?? []).map(t => ({
    id: t.id, scheduleId: t.scheduleId, orderIndex: t.orderIndex,
    name: t.name, ownerId: t.ownerId ?? null,
    startDate: t.startDate ? t.startDate.slice(0, 10) : null,
    endDate: t.endDate ? t.endDate.slice(0, 10) : null,
    durationDays: t.durationDays ?? 1,
    dependencyTaskId: t.dependencyTaskId ?? null,
    source: t.source,
    note: t.note ?? '',
    progressPercent: t.progressPercent ?? 0,
  }));

  return {
    schedules: [{
      id: schedule.id, iterationId: schedule.iterationId, groupId: schedule.groupId,
      status: schedule.status, version: schedule.version, rejectReason: schedule.rejectReason ?? null,
    }],
    tasks,
  };
}

export async function fetchAllSchedulesWithTasks(schedules) {
  const results = await Promise.all(schedules.map(s => fetchSchedule(s.id)));
  const allSchedules = [];
  const allTasks = [];
  for (const sched of results) {
    const flat = flattenScheduleResult(sched);
    allSchedules.push(...flat.schedules);
    allTasks.push(...flat.tasks);
  }
  return { schedules: allSchedules, tasks: allTasks };
}

// ─── 持久化操作 ────────────────────────────────────────────────────────────

export async function saveDraft(scheduleId, tasks, version, userId) {
  const payload = tasks.map(t => ({
    name: t.name, orderIndex: t.orderIndex, ownerId: t.ownerId ?? null,
    startDate: t.startDate ?? null, endDate: t.endDate ?? null,
    durationDays: t.durationDays ?? 1, dependencyTaskId: t.dependencyTaskId ?? null,
    source: t.source, note: t.note ?? '',
  }));
  return patch(`/schedules/${scheduleId}/draft`, { tasks: payload, version }, userId);
}

// ─── 状态转换 ──────────────────────────────────────────────────────────────

export async function submitSchedule(scheduleId, userId) {
  return post(`/schedules/${scheduleId}/submit`, undefined, userId);
}

export async function withdrawSchedule(scheduleId, userId) {
  return post(`/schedules/${scheduleId}/withdraw`, undefined, userId);
}

export async function approveSchedule(scheduleId, userId) {
  return post(`/schedules/${scheduleId}/approve`, undefined, userId);
}

export async function rejectSchedule(scheduleId, reason, userId) {
  return post(`/schedules/${scheduleId}/reject`, { reason }, userId);
}

export async function reschedule(scheduleId, userId) {
  return post(`/schedules/${scheduleId}/reschedule`, undefined, userId);
}

// ─── 任务操作 ───────────────────────────────────────────────────────────────

export async function insertRow(scheduleId, afterIndex, userId) {
  return post(`/tasks/${scheduleId}/rows`, { afterIndex }, userId);
}

export async function deleteRow(taskId, userId) {
  return del(`/tasks/${taskId}`, userId);
}

export async function updateTask(taskId, data, userId) {
  return patch(`/tasks/${taskId}`, data, userId);
}

export async function setDependency(taskId, dependencyTaskId, userId) {
  return patch(`/tasks/${taskId}/dependency`, { dependencyTaskId }, userId);
}

export async function propagateTask(taskId, userId) {
  return post(`/tasks/${taskId}/propagate`, undefined, userId);
}

// ─── 总表操作 ───────────────────────────────────────────────────────────────

export async function fetchMasterView(iterationId) {
  return get(`/master/${iterationId}`, null);
}

export async function addMasterRow(iterationId, scheduleId, taskData, userId) {
  return post(`/master/${iterationId}/rows`, { scheduleId, ...taskData }, userId);
}

export async function deleteMasterRow(taskId, userId) {
  return del(`/master/rows/${taskId}`, userId);
}
