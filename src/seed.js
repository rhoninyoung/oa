// src/seed.js
// 种子数据：1 项目 / 1 迭代 / 2 组 / 5 任务 × 组 + 3 用户

let _id = 0;
const uid = () => String(++_id);

export function buildSeed() {
  _id = 0;

  const users = [
    { id: 'u_gl1', name: '组长-张三', role: 'GROUP_LEADER', groupId: 'g1' },
    { id: 'u_gl2', name: '组长-李四', role: 'GROUP_LEADER', groupId: 'g2' },
    { id: 'u_pm',  name: 'PM-王五',  role: 'PROJECT_MANAGER', groupId: null },
  ];

  const groups = [
    { id: 'g1', name: '前端组' },
    { id: 'g2', name: '后端组' },
  ];

  const projects = [
    { id: 'p1', name: 'OA 平台升级项目' },
  ];

  const iterations = [
    {
      id: 'iter1',
      projectId: 'p1',
      name: 'Sprint 1 — MVP 交付',
      startDate: '2026-05-04',
      endDate:   '2026-05-15',
    },
  ];

  const schedules = [
    { id: 's1', iterationId: 'iter1', groupId: 'g1', status: 'PENDING', rejectReason: null },
    { id: 's2', iterationId: 'iter1', groupId: 'g2', status: 'PENDING', rejectReason: null },
  ];

  const makeTasks = (scheduleId, groupId) => {
    const base = groupId === 'g1'
      ? [
          { name: '需求分析', ownerId: 'u_gl1', startDate: '2026-05-04', endDate: '2026-05-06', durationDays: 3 },
          { name: 'UI 设计',   ownerId: 'u_gl1', startDate: '2026-05-07', endDate: '2026-05-09', durationDays: 3 },
          { name: '前端开发', ownerId: 'u_gl1', startDate: '2026-05-10', endDate: '2026-05-14', durationDays: 3 },
          { name: '联调测试', ownerId: 'u_gl1', startDate: '2026-05-15', endDate: '2026-05-15', durationDays: 1 },
          { name: '上线部署', ownerId: 'u_gl1', startDate: '2026-05-15', endDate: '2026-05-15', durationDays: 1 },
        ]
      : [
          { name: '需求分析', ownerId: 'u_gl2', startDate: '2026-05-04', endDate: '2026-05-06', durationDays: 3 },
          { name: '架构设计', ownerId: 'u_gl2', startDate: '2026-05-07', endDate: '2026-05-08', durationDays: 2 },
          { name: '后端开发', ownerId: 'u_gl2', startDate: '2026-05-09', endDate: '2026-05-14', durationDays: 4 },
          { name: '接口联调', ownerId: 'u_gl2', startDate: '2026-05-14', endDate: '2026-05-15', durationDays: 2 },
          { name: '部署上线', ownerId: 'u_gl2', startDate: '2026-05-15', endDate: '2026-05-15', durationDays: 1 },
        ];

    return base.map((t, i) => ({
      id: uid(),
      scheduleId,
      orderIndex: i,
      name: t.name,
      ownerId: t.ownerId,
      startDate: t.startDate,
      endDate: t.endDate,
      durationDays: t.durationDays,
      dependencyTaskId: null,
      source: 'GROUP',
      note: '',
    }));
  };

  const tasks = [
    ...makeTasks('s1', 'g1'),
    ...makeTasks('s2', 'g2'),
  ];

  return {
    users,
    groups,
    projects,
    iterations,
    schedules,
    tasks,
    activityLog: [
      {
        id: uid(),
        at: new Date().toISOString(),
        actorId: 'system',
        type: 'INIT',
        detail: '系统初始化完成',
      },
    ],
    currentUserId: 'u_gl1',
    activeIterationId: 'iter1',
    activeGroupId: 'g1',
    viewMode: 'GROUP',
    holidays: ['2026-05-01', '2026-05-02', '2026-05-03'],
  };
}
