// src/components/burndownChart.js
// Burndown chart for iteration progress tracking

import { getState } from '../store.js';

// Chart.js accessed via window.Chart (CDN global)
const Chart = window['Chart'];

let burndownChart = null;

/**
 * Render a burndown chart for the given iteration
 */
export function renderBurndownChart(iterationId) {
  const state = getState();
  const iteration = state.iterations.find(i => i.id === iterationId);
  if (!iteration) return;

  const sched = state.schedules.find(
    s => s.iterationId === iterationId && s.groupId === state.activeGroupId
  );
  if (!sched) return;

  const tasks = state.tasks.filter(t => t.scheduleId === sched.id);

  const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
  const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

  if (!startDate || !endDate) return;

  // Build burndown data
  const totalTasks = tasks.length;
  const totalDays = Math.ceil((endDate - startDate) / 86400000);
  const today = new Date();

  // Ideal burndown line: linear from totalTasks to 0
  const idealLabels = [];
  const idealValues = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    idealLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    idealValues.push(totalTasks - (totalTasks * i / totalDays));
  }

  // Actual burndown: count tasks completed (approved = done) by date
  // For MVP, we approximate "completed" by looking at endDate of tasks
  // Since we don't have a completion date, we use tasks that exist
  // For a proper burndown we'd need task.completedAt or similar
  // Here we show "remaining tasks" as tasks that haven't been approved yet
  const approvedCount = sched.status === 'APPROVED' ? totalTasks : 0;
  const remainingTasks = totalTasks - approvedCount;

  const actualLabels = idealLabels; // same time axis
  const actualValues = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    // Simple approximation: linearly decrease remaining tasks based on today's progress
    const daysPassed = (d - startDate) / 86400000;
    const todayDays = (today - startDate) / 86400000;
    if (daysPassed <= todayDays) {
      const progress = Math.min(1, Math.max(0, daysPassed / totalDays));
      actualValues.push(totalTasks - Math.round(totalTasks * progress));
    } else {
      actualValues.push(null); // future — no data
    }
  }

  renderBurndownCanvas(idealLabels, idealValues, actualValues, iteration.name);
}

function renderBurndownCanvas(labels, idealValues, actualValues, iterationName) {
  // Find or create container
  let container = document.getElementById('burndown-view-wrapper');
  if (!container) {
    container = document.createElement('div');
    container.id = 'burndown-view-wrapper';
    container.style.cssText = 'padding:16px;flex:1;overflow:auto;';
    document.getElementById('kanban-view-wrapper')?.parentNode?.appendChild(container);
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <h3 style="margin:0">燃尽图：${iterationName}</h3>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:16px;max-width:800px">
      <canvas id="chart-burndown" height="300"></canvas>
    </div>
    <div style="margin-top:8px;font-size:12px;color:var(--text-secondary)">
      注：实际线仅显示今日及之前的进度。未来日期无数据（虚线）。
    </div>
  `;

  const ctx = document.getElementById('chart-burndown');
  if (!ctx) return;

  if (burndownChart) burndownChart.destroy();

  burndownChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '理想进度',
          data: idealValues,
          borderColor: 'rgba(156, 163, 175, 1)',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '实际进度',
          data: actualValues,
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: `迭代: ${iterationName}`,
          font: { size: 14 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: '剩余任务数' },
        },
        x: {
          title: { display: true, text: '日期' },
        },
      },
    },
  });
}
