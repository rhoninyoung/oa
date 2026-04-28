// src/components/statsView.js
// Statistics dashboard with Chart.js bar/pie charts

import { getState } from '../store.js';
import { isAPIMode } from '../store.js';

// Chart.js accessed via window.Chart (CDN global)
const Chart = window['Chart'];

let workloadChart = null;
let daysChart = null;
let progressChart = null;

/**
 * Render the statistics dashboard for the given iterationId
 */
export function renderStatsView(iterationId) {
  const container = document.getElementById('stats-view-wrapper');
  if (!container) return;

  container.classList.remove('hidden');
  document.getElementById('group-view-wrapper')?.classList.add('hidden');
  document.getElementById('master-view-wrapper')?.classList.add('hidden');

  populateIterationSelect();

  if (!iterationId) {
    const state = getState();
    iterationId = state.activeIterationId || state.iterations[0]?.id;
  }

  if (iterationId) {
    loadAndRenderCharts(iterationId);
  }
}

/**
 * Populate the iteration dropdown in the stats header
 */
function populateIterationSelect() {
  const state = getState();
  const select = document.getElementById('stats-iteration-select');
  if (!select) return;

  select.innerHTML = state.iterations
    .map(iter => `<option value="${iter.id}" ${iter.id === state.activeIterationId ? 'selected' : ''}>${iter.name}</option>`)
    .join('');

  select.onchange = () => {
    const selectedId = select.value;
    loadAndRenderCharts(selectedId);
  };
}

/**
 * Load stats data (local or API) and render charts
 */
async function loadAndRenderCharts(iterationId) {
  let workloadData, progressData;

  if (isAPIMode()) {
    try {
      const [wl, prog] = await Promise.all([
        fetch(`/api/statistics/workload?iterationId=${iterationId}`).then(r => r.json()),
        fetch(`/api/statistics/progress?projectId=${getState().projects[0]?.id}`).then(r => r.json()),
      ]);
      workloadData = wl;
      progressData = prog;
    } catch (e) {
      console.error('[Stats] API fetch failed, using local data', e);
      [workloadData, progressData] = computeLocalStats(iterationId);
    }
  } else {
    [workloadData, progressData] = computeLocalStats(iterationId);
  }

  renderWorkloadChart(workloadData);
  renderDaysChart(workloadData);
  renderProgressChart(progressData);
}

/**
 * Compute workload stats from local state
 */
function computeLocalStats(iterationId) {
  const state = getState();
  const iteration = state.iterations.find(i => i.id === iterationId);
  const project = state.projects.find(p => p.id === iteration?.projectId);

  // Workload: group tasks
  const schedules = state.schedules.filter(s => s.iterationId === iterationId);
  const scheduleGroupMap = new Map(schedules.map(s => [s.id, s.groupId]));
  const groupIds = [...new Set(schedules.map(s => s.groupId))];

  const groups = groupIds.map(gId => {
    const group = state.groups.find(g => g.id === gId);
    const groupScheduleIds = schedules.filter(s => s.groupId === gId).map(s => s.id);
    const tasks = state.tasks.filter(
      t => groupScheduleIds.includes(t.scheduleId) && t.source === 'GROUP'
    );
    return {
      id: gId,
      name: group?.name ?? gId,
      totalTasks: tasks.length,
      totalDays: tasks.reduce((s, t) => s + (t.durationDays ?? 0), 0),
    };
  });

  const workloadData = { groups };

  // Progress: per-iteration status counts
  const iterations = state.iterations
    .filter(i => i.projectId === project?.id)
    .map(iter => {
      const iterScheds = state.schedules.filter(s => s.iterationId === iter.id);
      const counts = { pending: 0, reviewing: 0, approved: 0, rejected: 0 };
      for (const s of iterScheds) {
        const key = s.status.toLowerCase();
        if (key in counts) counts[key]++;
      }
      return { id: iter.id, name: iter.name, ...counts };
    });

  const progressData = { iterations };

  return [workloadData, progressData];
}

/**
 * Render or update the workload bar chart
 */
function renderWorkloadChart(data) {
  const ctx = document.getElementById('chart-workload');
  if (!ctx) return;

  if (workloadChart) workloadChart.destroy();

  const labels = data.groups.map(g => g.name);
  const values = data.groups.map(g => g.totalTasks);

  workloadChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '任务数',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}

/**
 * Render or update the total days bar chart
 */
function renderDaysChart(data) {
  const ctx = document.getElementById('chart-days');
  if (!ctx) return;

  if (daysChart) daysChart.destroy();

  const labels = data.groups.map(g => g.name);
  const values = data.groups.map(g => g.totalDays);

  daysChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '工期（天）',
        data: values,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

/**
 * Render or update the progress stacked bar chart
 */
function renderProgressChart(data) {
  const ctx = document.getElementById('chart-progress');
  if (!ctx) return;

  if (progressChart) progressChart.destroy();

  const labels = data.iterations.map(i => i.name);
  const statusKeys = ['pending', 'reviewing', 'approved', 'rejected'];
  const colors = {
    pending: 'rgba(234, 179, 8, 0.7)',
    reviewing: 'rgba(59, 130, 246, 0.7)',
    approved: 'rgba(16, 185, 129, 0.7)',
    rejected: 'rgba(239, 68, 68, 0.7)',
  };

  progressChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: statusKeys.map(key => ({
        label: { pending: '待提交', reviewing: '审核中', approved: '已批准', rejected: '已拒绝' }[key],
        data: data.iterations.map(i => i[key]),
        backgroundColor: colors[key],
        borderWidth: 1,
      })),
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
  });
}
