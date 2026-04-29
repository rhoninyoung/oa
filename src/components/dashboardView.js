// src/components/dashboardView.js
// Dashboard/首页视图 — 展示待办/进度/快捷入口
// 数据来自 store（localStorage）或 API 回退

import { getState } from '../store.js';

// ─── Pure computation functions (mirrored from tests/dashboard.test.js) ─────────

/**
 * @param {{durationDays:number, progressPercent:number}[]} tasks
 * @returns {number} 0-100 加权完成率
 */
export function computeIterationProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  let totalDays = 0;
  let weightedSum = 0;
  for (const t of tasks) {
    const days = t.durationDays || 1;
    totalDays += days;
    weightedSum += days * (t.progressPercent ?? 0);
  }
  if (totalDays === 0) return 0;
  return Math.round(weightedSum / totalDays);
}

/**
 * @param {{endDate:string|null, progressPercent:number}[]} tasks
 * @param {string} today  YYYY-MM-DD
 * @returns {object[]} 滞后任务
 */
export function detectLaggingTasks(tasks, today) {
  if (!tasks) return [];
  return tasks.filter(t => {
    if (!t.endDate) return false;
    if ((t.progressPercent ?? 0) >= 100) return false;
    return t.endDate < today;
  });
}

/**
 * @param {object} ctx
 * @returns {{pendingCount,reviewingCount,laggingTasks,laggingCount,groupProgress,overallProgress}}
 */
export function computeDashboardStats({ tasks, schedules, groups, today, currentUserId, users }) {
  const currentUser = users.find(u => u.id === currentUserId);
  const myGroupIds = currentUser?.groupId ? [currentUser.groupId] : [];

  const pendingSchedules = schedules.filter(s =>
    (s.status === 'PENDING' || s.status === 'REJECTED') &&
    myGroupIds.includes(s.groupId)
  );
  const reviewingSchedules = schedules.filter(s =>
    s.status === 'REVIEWING' &&
    myGroupIds.includes(s.groupId)
  );

  const myTasks = tasks.filter(t =>
    myGroupIds.some(gid => {
      const sched = schedules.find(s => s.id === t.scheduleId);
      return sched?.groupId === gid;
    })
  );
  const laggingTasks = detectLaggingTasks(myTasks, today);

  const groupProgress = groups.map(g => {
    const gSchedIds = schedules.filter(s => s.groupId === g.id).map(s => s.id);
    const gTasks = tasks.filter(t => gSchedIds.includes(t.scheduleId));
    return { groupId: g.id, name: g.name, progress: computeIterationProgress(gTasks) };
  });

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

// ─── Rendering ────────────────────────────────────────────────────────────────

let _dashboardChart = null; // reserved for future Chart.js integration

/**
 * Render the Dashboard view into #dashboard-view-wrapper
 */
export function renderDashboardView() {
  const wrapper = document.getElementById('dashboard-view-wrapper');
  if (!wrapper) return;

  const state = getState();
  const today = new Date().toISOString().slice(0, 10);

  const stats = computeDashboardStats({
    tasks: state.tasks ?? [],
    schedules: state.schedules ?? [],
    groups: state.groups ?? [],
    today,
    currentUserId: state.currentUserId,
    users: state.users ?? [],
  });

  const currentUser = state.users?.find(u => u.id === state.currentUserId);
  const isPM = currentUser?.role === 'PROJECT_MANAGER';
  const myGroupId = currentUser?.groupId;

  // Lagging badge color
  const lagColor = stats.laggingCount > 0 ? '#f59e0b' : '#22c55e';

  wrapper.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h2>首页</h2>
        <span class="dashboard-greeting">${currentUser?.name ?? '用户'}，${isPM ? '项目经理' : '组长'}</span>
      </div>

      <!-- Stat cards -->
      <div class="dashboard-stat-cards">
        <div class="stat-card">
          <div class="stat-value">${stats.pendingCount}</div>
          <div class="stat-label">待提交</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.reviewingCount}</div>
          <div class="stat-label">待审批</div>
        </div>
        <div class="stat-card" style="border-left:3px solid ${lagColor}">
          <div class="stat-value" style="color:${lagColor}">${stats.laggingCount}</div>
          <div class="stat-label">滞后任务</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.overallProgress}%</div>
          <div class="stat-label">整体进度</div>
        </div>
      </div>

      <!-- Group progress section -->
      <div class="dashboard-section">
        <h3>各组进度</h3>
        ${stats.groupProgress.length === 0 ? '<p class="text-muted">暂无数据</p>' : ''}
        ${stats.groupProgress.map(g => `
          <div class="progress-bar-item">
            <div class="progress-bar-label">
              <span>${g.name}</span>
              <span>${g.progress}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${g.progress}%"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Lagging tasks -->
      ${stats.laggingCount > 0 ? `
      <div class="dashboard-section">
        <h3 style="color:#f59e0b">滞后任务（已过期但进度未完成）</h3>
        <ul class="lagging-list">
          ${stats.laggingTasks.map(t => `
            <li class="lagging-item">
              <span class="lagging-name">${t.name}</span>
              <span class="lagging-meta">${t.endDate} · ${t.progressPercent ?? 0}%</span>
            </li>
          `).join('')}
        </ul>
      </div>` : ''}

      <!-- Quick actions -->
      <div class="dashboard-section">
        <h3>快捷操作</h3>
        <div class="dashboard-quick-actions">
          <button class="dashboard-btn" id="qa-wbs">打开 WBS 视图</button>
          ${!isPM ? `<button class="dashboard-btn" id="qa-submit">提交排期</button>` : ''}
          ${isPM ? `<button class="dashboard-btn" id="qa-approve">审批待办</button>` : ''}
          <button class="dashboard-btn" id="qa-gantt">甘特图</button>
        </div>
      </div>
    </div>
  `;

  // Wire quick action buttons
  wrapper.querySelector('#qa-wbs')?.addEventListener('click', () => {
    document.getElementById('tab-wbs')?.click();
  });
  wrapper.querySelector('#qa-gantt')?.addEventListener('click', () => {
    document.getElementById('tab-gantt')?.click();
  });
  wrapper.querySelector('#qa-submit')?.addEventListener('click', () => {
    // Switch to WBS and trigger submit
    document.getElementById('tab-wbs')?.click();
    const submitBtn = document.getElementById('btn-submit');
    submitBtn?.click();
  });
  wrapper.querySelector('#qa-approve')?.addEventListener('click', () => {
    document.getElementById('tab-wbs')?.click();
  });
}
