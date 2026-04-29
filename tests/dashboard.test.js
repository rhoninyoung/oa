// tests/dashboard.test.js
// TDD: Dashboard data computation纯函数 — 加权完成率 + 滞后检测
//
// 实现函数前先写测试，用例覆盖：
//   WD-01..03  computeIterationProgress（加权完成率）
//   WD-04..07  detectLaggingTasks（滞后任务检测）
//   WD-08..10  computeDashboardStats（综合仪表盘数据）

import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * 计算单个迭代的加权完成率（按工期加权）
 * @param {{durationDays:number, progressPercent:number}[]} tasks
 * @returns {number} 0-100
 */
function computeIterationProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  let totalDays = 0;
  let weightedSum = 0;
  for (const t of tasks) {
    const days = t.durationDays || 1; // duration=0 时按 1 算（避免被忽略）
    totalDays += days;
    weightedSum += days * (t.progressPercent ?? 0);
  }
  if (totalDays === 0) return 0;
  return Math.round(weightedSum / totalDays);
}

/**
 * 检测滞后任务：已过 endDate 且 progress < 100
 * @param {{endDate:string|null, progressPercent:number}[]} tasks
 * @param {string} today  YYYY-MM-DD
 * @returns {object[]} 滞后任务列表
 */
function detectLaggingTasks(tasks, today) {
  if (!tasks) return [];
  return tasks.filter(t => {
    if (!t.endDate) return false;
    if ((t.progressPercent ?? 0) >= 100) return false;
    return t.endDate < today;
  });
}

/**
 * 计算 Dashboard 统计数据
 * @param {object} ctx
 * @param {object[]} ctx.tasks
 * @param {{status:string}[]} ctx.schedules
 * @param {{name:string}[]} ctx.groups
 * @param {string} ctx.today  YYYY-MM-DD
 * @param {string} ctx.currentUserId
 * @param {{role:string, groupId:string|null}[]} ctx.users
 * @returns {object}
 */
function computeDashboardStats({ tasks, schedules, groups, today, currentUserId, users }) {
  // 1. 待审批计划数（当前用户作为 GL 时，待本人所在组的 PENDING + REVIEWING）
  const currentUser = users.find(u => u.id === currentUserId);
  const myGroupIds = currentUser?.groupId
    ? [currentUser.groupId]
    : [];

  const pendingSchedules = schedules.filter(s =>
    (s.status === 'PENDING' || s.status === 'REJECTED') &&
    myGroupIds.includes(s.groupId)
  );

  const reviewingSchedules = schedules.filter(s =>
    s.status === 'REVIEWING' &&
    myGroupIds.includes(s.groupId)
  );

  // 2. 滞后任务（当前用户所在组的任务）
  const myTasks = tasks.filter(t =>
    myGroupIds.some(gid => {
      const sched = schedules.find(s => s.id === t.scheduleId);
      return sched?.groupId === gid;
    })
  );
  const laggingTasks = detectLaggingTasks(myTasks, today);

  // 3. 各组进度（按迭代分组计算加权进度）
  const groupProgress = groups.map(g => {
    const gSchedIds = schedules.filter(s => s.groupId === g.id).map(s => s.id);
    const gTasks = tasks.filter(t => gSchedIds.includes(t.scheduleId));
    return {
      groupId: g.id,
      name: g.name,
      progress: computeIterationProgress(gTasks),
    };
  });

  // 4. 整体进度（所有任务加权）
  const overallProgress = computeIterationProgress(tasks);

  return {
    pendingCount: pendingSchedules.length,
    reviewingCount: reviewingSchedules.length,
    laggingTasks,
    laggingCount: laggingTasks.length,
    groupProgress,
    overallProgress,
  };
}

// ─── WD-01: 迭代无任务 → 0 ─────────────────────────────────────────────────
describe('computeIterationProgress', () => {
  it('empty tasks → 0', () => {
    assert.strictEqual(computeIterationProgress([]), 0);
  });

  it('null input → 0', () => {
    assert.strictEqual(computeIterationProgress(null), 0);
  });

  // WD-02: 按工期加权平均
  it('weighted average by duration', () => {
    // task1: 10天 50%, task2: 10天 100% → (10*50 + 10*100)/20 = 75
    const tasks = [
      { durationDays: 10, progressPercent: 50 },
      { durationDays: 10, progressPercent: 100 },
    ];
    assert.strictEqual(computeIterationProgress(tasks), 75);
  });

  it('different durations weighted correctly', () => {
    // task1: 2天 0%, task2: 8天 100% → (2*0 + 8*100)/10 = 80
    const tasks = [
      { durationDays: 2, progressPercent: 0 },
      { durationDays: 8, progressPercent: 100 },
    ];
    assert.strictEqual(computeIterationProgress(tasks), 80);
  });

  // WD-03: duration=0 → treated as 1 in both numerator and denominator
  // (1*0 + 10*100)/11 = 90.9 → Math.round = 91
  it('duration=0 → treated as 1', () => {
    const tasks = [
      { durationDays: 0, progressPercent: 0 },
      { durationDays: 10, progressPercent: 100 },
    ];
    assert.strictEqual(computeIterationProgress(tasks), 91);
  });

  it('all progress 0 → 0', () => {
    assert.strictEqual(computeIterationProgress([
      { durationDays: 5, progressPercent: 0 },
      { durationDays: 10, progressPercent: 0 },
    ]), 0);
  });

  it('all progress 100 → 100', () => {
    assert.strictEqual(computeIterationProgress([
      { durationDays: 5, progressPercent: 100 },
      { durationDays: 10, progressPercent: 100 },
    ]), 100);
  });

  it('null progressPercent → treated as 0', () => {
    assert.strictEqual(computeIterationProgress([
      { durationDays: 5, progressPercent: null },
      { durationDays: 5, progressPercent: 100 },
    ]), 50);
  });
});

// ─── WD-04..07: detectLaggingTasks ──────────────────────────────────────────
describe('detectLaggingTasks', () => {
  const today = '2026-04-28';

  // WD-04: 今天已过 endDate 但 progress < 100 → 滞后
  it('past endDate + progress < 100 → lagging', () => {
    const tasks = [
      { endDate: '2026-04-20', progressPercent: 30, name: '任务A', id: 't1' },
    ];
    const result = detectLaggingTasks(tasks, today);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, '任务A');
  });

  // WD-05: endDate 未到，即使 progress 低也不算滞后
  it('future endDate + low progress → not lagging', () => {
    const tasks = [
      { endDate: '2026-05-10', progressPercent: 10, name: '任务B', id: 't2' },
    ];
    assert.deepStrictEqual(detectLaggingTasks(tasks, today), []);
  });

  // WD-06: progress=100 即已完成，不算滞后
  it('progress=100 → not lagging even if past endDate', () => {
    const tasks = [
      { endDate: '2026-04-20', progressPercent: 100, name: '任务C', id: 't3' },
    ];
    assert.deepStrictEqual(detectLaggingTasks(tasks, today), []);
  });

  // WD-07: 无 endDate → 不检测
  it('null endDate → not lagging', () => {
    const tasks = [
      { endDate: null, progressPercent: 0, name: '任务D', id: 't4' },
    ];
    assert.deepStrictEqual(detectLaggingTasks(tasks, today), []);
  });

  it('undefined tasks → empty array', () => {
    assert.deepStrictEqual(detectLaggingTasks(undefined, today), []);
  });

  it('today exactly equals endDate → NOT lagging (must be strictly past)', () => {
    const tasks = [
      { endDate: '2026-04-28', progressPercent: 50, name: '任务E', id: 't5' },
    ];
    assert.deepStrictEqual(detectLaggingTasks(tasks, today), []);
  });

  it('progress=99 + past → lagging', () => {
    const tasks = [
      { endDate: '2026-04-20', progressPercent: 99, name: '任务F', id: 't6' },
    ];
    assert.strictEqual(detectLaggingTasks(tasks, today).length, 1);
  });
});

// ─── WD-08..10: computeDashboardStats ────────────────────────────────────────
describe('computeDashboardStats', () => {
  const today = '2026-04-28';
  const groups = [
    { id: 'g1', name: '前端组' },
    { id: 'g2', name: '后端组' },
  ];
  const schedules = [
    { id: 's1', groupId: 'g1', status: 'PENDING' },
    { id: 's2', groupId: 'g1', status: 'REVIEWING' },
    { id: 's3', groupId: 'g2', status: 'APPROVED' },
  ];
  const tasks = [
    { id: 't1', scheduleId: 's1', durationDays: 10, progressPercent: 50, endDate: '2026-04-20' },
    { id: 't2', scheduleId: 's1', durationDays: 10, progressPercent: 100, endDate: '2026-04-20' },
    { id: 't3', scheduleId: 's2', durationDays: 5, progressPercent: 30, endDate: '2026-04-25' },
    { id: 't4', scheduleId: 's3', durationDays: 8, progressPercent: 80, endDate: '2026-05-01' },
  ];
  const users = [
    { id: 'u1', name: '张三', role: 'GROUP_LEADER', groupId: 'g1' },
    { id: 'u2', name: '李四', role: 'GROUP_LEADER', groupId: 'g2' },
    { id: 'pm1', name: '王五', role: 'PROJECT_MANAGER', groupId: null },
  ];

  // WD-08: GL 看到自己组的 pending + 滞后任务
  // g1: s1=PENDING, s2=REVIEWING → pendingCount=1, reviewingCount=1
  // t1 (end 4/20, 50%) 和 t3 (end 4/25, 30%) 均已过期 → laggingCount=2
  it('GL g1: pending=1, reviewing=1, lagging=2 (t1+t3 past)', () => {
    const result = computeDashboardStats({
      tasks, schedules, groups, today,
      currentUserId: 'u1', users,
    });
    assert.strictEqual(result.pendingCount, 1);  // s1 PENDING
    assert.strictEqual(result.reviewingCount, 1); // s2 REVIEWING
    assert.strictEqual(result.laggingCount, 2); // t1 past+50%, t3 past+30%
    assert.strictEqual(result.laggingTasks[0].id, 't1');
    assert.strictEqual(result.laggingTasks[1].id, 't3');
  });

  // WD-09: 整体进度 = 所有任务加权平均
  it('overallProgress = weighted avg of all tasks', () => {
    // (10*50 + 10*100 + 5*30 + 8*80) / (10+10+5+8) = (500+1000+150+640)/33 ≈ 69
    const result = computeDashboardStats({ tasks, schedules, groups, today, currentUserId: 'pm1', users });
    assert.strictEqual(result.overallProgress, 69);
  });

  // WD-10: 各组进度分别计算
  it('groupProgress for each group', () => {
    const result = computeDashboardStats({ tasks, schedules, groups, today, currentUserId: 'u1', users });
    const g1 = result.groupProgress.find(g => g.name === '前端组');
    const g2 = result.groupProgress.find(g => g.name === '后端组');
    // g1: (10*50 + 10*100 + 5*30)/(10+10+5) = (500+1000+150)/25 = 66
    assert.strictEqual(g1.progress, 66);
    // g2: (8*80)/8 = 80
    assert.strictEqual(g2.progress, 80);
  });

  it('PM (no groupId) → empty pending/reviewing (no groupId match)', () => {
    const result = computeDashboardStats({ tasks, schedules, groups, today, currentUserId: 'pm1', users });
    assert.strictEqual(result.pendingCount, 0);
    assert.strictEqual(result.reviewingCount, 0);
  });
});
