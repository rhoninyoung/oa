// src/io/excel.js
// Excel 导入/导出功能 — 使用 SheetJS (xlsx) via CDN
import { getState } from '../store.js';

// SheetJS loaded via CDN (see index.html <script src="..."> tag)
// We access it via window.XLSX after CDN load
const XLSX = window.XLSX;

/**
 * 导出当前排期表为 .xlsx 文件
 * Sheet1: WBS任务列表（按 orderIndex 排序）
 * Sheet2: 汇总信息
 */
export function exportScheduleToExcel() {
  const state = getState();
  const sched = state.schedules.find(
    s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
  );
  if (!sched) { showToast('当前无排期数据', 'error'); return; }

  const project = state.projects.find(p =>
    state.iterations.find(i => i.id === sched.iterationId)?.projectId === p.id
  );
  const iteration = state.iterations.find(i => i.id === sched.iterationId);
  const group = state.groups.find(g => g.id === sched.groupId);
  const tasks = state.tasks
    .filter(t => t.scheduleId === sched.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // Sheet1: WBS 任务列表
  const wsData = [
    ['序号', '任务名称', '负责人', '开始日期', '结束日期', '工期(天)', '依赖任务', '来源', '备注'],
    ...tasks.map((t, i) => [
      i + 1,
      t.name ?? '',
      getOwnerName(t.ownerId, state),
      t.startDate ?? '',
      t.endDate ?? '',
      t.durationDays ?? 0,
      t.dependencyTaskId ? getTaskName(t.dependencyTaskId, tasks) : '',
      t.source === 'MASTER' ? '总表行' : '小组行',
      t.note ?? ''
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WBS排期');

  // Sheet2: 汇总信息
  const meta = [
    ['项目', project?.name ?? ''],
    ['迭代', iteration?.name ?? ''],
    ['小组', group?.name ?? ''],
    ['状态', sched.status],
    ['版本号', sched.version ?? 1],
    ['导出时间', new Date().toLocaleString('zh-CN')]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(meta);
  ws2['!cols'] = [{ wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws2, '汇总');

  const filename = `${project?.name ?? '排期'}_${iteration?.name ?? ''}_${group?.name ?? ''}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * 导出总表视图为 .xlsx（仅 APPROVED 组的 GROUP 任务 + 所有 MASTER 任务）
 */
export function exportMasterViewToExcel() {
  const state = getState();

  const masterTasks = state.tasks.filter(t => {
    if (t.source === 'MASTER') return true;
    const sched = state.schedules.find(s => s.id === t.scheduleId);
    return sched?.status === 'APPROVED';
  });

  const project = state.projects[0];
  const iteration = state.iterations.find(i => i.id === state.activeIterationId);

  const wsData = [
    ['序号', '任务名称', '负责人', '开始日期', '结束日期', '工期(天)', '所属小组', '来源', '备注'],
    ...masterTasks.map((t, i) => {
      const sched = state.schedules.find(s => s.id === t.scheduleId);
      const group = state.groups.find(g => g.id === sched?.groupId);
      return [
        i + 1,
        t.name ?? '',
        getOwnerName(t.ownerId, state),
        t.startDate ?? '',
        t.endDate ?? '',
        t.durationDays ?? 0,
        group?.name ?? '',
        t.source === 'MASTER' ? '总表行' : '小组行',
        t.note ?? ''
      ];
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '总表');

  const meta = [
    ['项目', project?.name ?? ''],
    ['迭代', iteration?.name ?? ''],
    ['导出时间', new Date().toLocaleString('zh-CN')]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(meta);
  ws2['!cols'] = [{ wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws2, '汇总');

  XLSX.writeFile(wb, `总表_${project?.name ?? ''}_${Date.now()}.xlsx`);
}

/**
 * 从 Excel 文件导入任务数据
 * @param {ArrayBuffer} buffer - 文件内容
 * @returns {{ ok: boolean, tasks?: object[], error?: string }}
 */
export function importScheduleFromExcel(buffer) {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets['WBS排期'] || wb.Sheets[0];
    if (!ws) return { ok: false, error: '未找到 WBS排期 工作表' };

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) return { ok: false, error: '工作表数据为空' };

    const header = rows[0];
    const colMap = buildColumnMap(header);

    if (colMap.name === -1 || colMap.startDate === -1) {
      return { ok: false, error: '表头缺少必需列：任务名称、开始日期' };
    }

    const state = getState();
    const sched = state.schedules.find(
      s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
    );
    if (!sched) return { ok: false, error: '当前无排期数据' };

    // 收集现有 task name → id 映射（用于依赖解析）
    const existingTasks = state.tasks.filter(t => t.scheduleId === sched.id);
    const nameToId = new Map(existingTasks.map(t => [t.name, t.id]));
    const nameToIdx = new Map(existingTasks.map((t, i) => [t.name, i]));

    const tasks = [];
    let maxOrderIndex = existingTasks.length > 0
      ? Math.max(...existingTasks.map(t => t.orderIndex))
      : -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[colMap.name]) continue;

      const name = String(row[colMap.name] ?? '').trim();
      if (!name) continue;

      const ownerName = colMap.owner !== -1 ? String(row[colMap.owner] ?? '').trim() : '';
      const ownerId = ownerName ? findOwnerId(ownerName, state) : state.users[0]?.id ?? '';

      const startDate = parseDate(row[colMap.startDate]);
      const durationDays = colMap.duration !== -1
        ? parseDuration(row[colMap.duration])
        : 1;

      const endDate = colMap.endDate !== -1
        ? parseDate(row[colMap.endDate])
        : calcEndDate(startDate, durationDays, state.holidays);

      const depTaskName = colMap.dependency !== -1 ? String(row[colMap.dependency] ?? '').trim() : '';
      const dependencyTaskId = depTaskName ? nameToId.get(depTaskName) ?? null : null;

      const note = colMap.note !== -1 ? String(row[colMap.note] ?? '').trim() : '';

      maxOrderIndex++;
      tasks.push({
        id: `imported_${Date.now()}_${i}`,
        scheduleId: sched.id,
        orderIndex: maxOrderIndex,
        name,
        ownerId,
        startDate,
        endDate,
        durationDays,
        dependencyTaskId,
        source: 'GROUP',
        note
      });
    }

    return { ok: true, tasks };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildColumnMap(header) {
  const lower = header.map(h => String(h ?? '').toLowerCase());
  return {
    name: lower.findIndex(h => h.includes('任务名称') || h.includes('任务名')),
    owner: lower.findIndex(h => h.includes('负责人')),
    startDate: lower.findIndex(h => h.includes('开始日期')),
    endDate: lower.findIndex(h => h.includes('结束日期')),
    duration: lower.findIndex(h => h.includes('工期')),
    dependency: lower.findIndex(h => h.includes('依赖')),
    note: lower.findIndex(h => h.includes('备注'))
  };
}

function getOwnerName(ownerId, state) {
  if (!ownerId) return '';
  const user = state.users.find(u => u.id === ownerId);
  return user?.name ?? ownerId;
}

function findOwnerId(name, state) {
  const user = state.users.find(u => u.name === name);
  if (user) return user.id;
  // 模糊匹配
  const lower = name.toLowerCase();
  const found = state.users.find(u => u.name.toLowerCase().includes(lower));
  return found?.id ?? state.users[0]?.id ?? '';
}

function getTaskName(taskId, tasks) {
  const task = tasks.find(t => t.id === taskId);
  return task?.name ?? taskId;
}

function parseDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel date serial number → YYYY-MM-DD
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  return String(val).trim();
}

function parseDuration(val) {
  if (typeof val === 'number') return Math.max(1, Math.round(val));
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 1 : Math.max(1, n);
}

function calcEndDate(startDate, durationDays, holidays) {
  if (!startDate || durationDays <= 0) return startDate ?? '';
  const start = new Date(startDate);
  let days = durationDays;
  const d = new Date(start);
  while (days > 1) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    const iso = d.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidays.includes(iso)) {
      days--;
    }
  }
  return d.toISOString().slice(0, 10);
}
