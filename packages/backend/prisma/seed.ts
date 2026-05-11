// packages/backend/prisma/seed.ts
// 完整用户数据 seed — 基于用户提供的人员表

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.notificationOutbox.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupSchedule.deleteMany();
  await prisma.iteration.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.holiday.deleteMany();

  // Groups
  await prisma.group.createMany({
    data: [
      { id: 'g1',  name: '前端组' },
      { id: 'g2',  name: '后端组' },
      { id: 'g3',  name: '算法组' },
      { id: 'g4',  name: '软件组' },
      { id: 'g5',  name: '硬件组' },
      { id: 'g6',  name: '嵌入式组' },
      { id: 'g7',  name: '测试组' },
      { id: 'g8',  name: '引擎组' },
      { id: 'g9',  name: '项目组' },
      { id: 'g10', name: '人事组' },
      { id: 'g11', name: '产品组' },
      { id: 'g12', name: '算法工程化组' },
    ],
  });

  // Users — role: GROUP_LEADER(组长/代理组长) | PROJECT_MANAGER(PM/非组长)
  // GROUP_LEADER: 组长 or 代理组长 (u3,u4,u6,u13,u23,u25,u34)
  // roles 中 PM: u1(虞坤森), u6(李林), u23(范文成)
  // 已删除: u2(吴志明), u28(武立涵), u32(黄喆)
  await prisma.user.createMany({
    data: [
      // ID=1  项目组  部门经理兼董事长助理 → PM
      { id: 'u1',  name: '虞坤森',   role: 'PROJECT_MANAGER', position: '部门经理兼董事长助理', department: '项目组',     groupId: 'g9',  roles: ['DEFAULT_RECEIVER', 'HR', 'LEADER', 'PM'] },
      // ID=3  软件组  高级软件工程师（软件组组长）→ GROUP_LEADER
      { id: 'u3',  name: '杜进虎',   role: 'GROUP_LEADER',    position: '高级软件工程师（软件组组长）', department: '软件组', groupId: 'g4',  roles: [] },
      // ID=4  引擎组  经理助理（引擎组组长）→ GROUP_LEADER（组员）
      { id: 'u4',  name: '赵丹丹',   role: 'GROUP_LEADER',    position: '经理助理（引擎组组长）', department: '引擎组',    groupId: 'g8',  roles: [] },
      // ID=5  算法组  算法工程师
      { id: 'u5',  name: '汤香渝',   role: 'PROJECT_MANAGER', position: '算法工程师',           department: '算法组',     groupId: 'g3',  roles: [] },
      // ID=6  产品组  部门副经理兼产品经理（产品组组长）→ GROUP_LEADER，PM
      { id: 'u6',  name: '李林',     role: 'GROUP_LEADER',    position: '部门副经理兼产品经理（产品组组长）', department: '产品组', groupId: 'g11', roles: ['PM'] },
      // ID=7  产品组  产品助理 → 组员
      { id: 'u7',  name: '赵昕',     role: 'PROJECT_MANAGER', position: '产品助理',             department: '产品组',     groupId: 'g11', roles: [] },
      // ID=8  硬件组  结构工程师
      { id: 'u8',  name: '付国瑞',   role: 'PROJECT_MANAGER', position: '结构工程师',           department: '硬件组',     groupId: 'g5',  roles: [] },
      // ID=9  引擎组  设计工程师
      { id: 'u9',  name: '缪天然',   role: 'PROJECT_MANAGER', position: '设计工程师',           department: '引擎组',     groupId: 'g8',  roles: [] },
      // ID=10 测试组  测试工程师
      { id: 'u10', name: '刘海斌',   role: 'PROJECT_MANAGER', position: '测试工程师',           department: '测试组',     groupId: 'g7',  roles: [] },
      // ID=11 人事组  HRBP → 组员
      { id: 'u11', name: '王艳荣',   role: 'PROJECT_MANAGER', position: 'HRBP',                department: '人事组',     groupId: 'g10', roles: ['DEFAULT_RECEIVER', 'HR', 'ADMIN', 'AI_CS_DASHBOARD', 'COMMENT_CC', 'EMPLOYEE', 'LEADER_ASSISTANT', 'SMARTBOX_AUTH', 'TASK_ADMIN', 'USER_HR'] },
      // ID=12 软件组  软件工程师
      { id: 'u12', name: '高逸飞',   role: 'PROJECT_MANAGER', position: '软件工程师',           department: '软件组',     groupId: 'g4',  roles: [] },
      // ID=13 硬件组  高级硬件工程师（硬件组组长）→ GROUP_LEADER（组员）
      { id: 'u13', name: '王绘清',   role: 'GROUP_LEADER',    position: '高级硬件工程师（硬件组组长）', department: '硬件组', groupId: 'g5',  roles: [] },
      // ID=14 软件组  软件工程师
      { id: 'u14', name: '吕松年',   role: 'PROJECT_MANAGER', position: '软件工程师',           department: '软件组',     groupId: 'g4',  roles: [] },
      // ID=15 硬件组  硬件工程师
      { id: 'u15', name: '张少川',   role: 'PROJECT_MANAGER', position: '硬件工程师',           department: '硬件组',     groupId: 'g5',  roles: [] },
      // ID=16 算法组  算法工程师
      { id: 'u16', name: '吴与伦',   role: 'PROJECT_MANAGER', position: '算法工程师',           department: '算法组',     groupId: 'g3',  roles: [] },
      // ID=17 测试组  测试工程师
      { id: 'u17', name: '胡晓明',   role: 'PROJECT_MANAGER', position: '测试工程师',           department: '测试组',     groupId: 'g7',  roles: [] },
      // ID=18 引擎组  研发工程师
      { id: 'u18', name: '刘沄',     role: 'PROJECT_MANAGER', position: '研发工程师',           department: '引擎组',     groupId: 'g8',  roles: [] },
      // ID=19 引擎组  数据处理专员
      { id: 'u19', name: '胡孟瑶',   role: 'PROJECT_MANAGER', position: '数据处理专员',         department: '引擎组',     groupId: 'g8',  roles: [] },
      // ID=22 嵌入式组  嵌入式工程师
      { id: 'u22', name: '陈林',     role: 'PROJECT_MANAGER', position: '嵌入式工程师',         department: '嵌入式组',   groupId: 'g6',  roles: [] },
      // ID=23 算法组  算法工程师（算法组组长）→ GROUP_LEADER，PM
      { id: 'u23', name: '范文成',   role: 'GROUP_LEADER',    position: '算法工程师（算法组组长）', department: '算法组', groupId: 'g3', roles: ['PM'] },
      // ID=24 算法组  算法工程师
      { id: 'u24', name: '胡靖',     role: 'PROJECT_MANAGER', position: '算法工程师',           department: '算法组',     groupId: 'g3',  roles: [] },
      // ID=25 测试组  测试工程师（测试组代理组长）→ GROUP_LEADER
      { id: 'u25', name: '李欢',     role: 'GROUP_LEADER',    position: '测试工程师（测试组代理组长）', department: '测试组', groupId: 'g7',  roles: [] },
      // ID=26 引擎组  产品运维工程师
      { id: 'u26', name: '高祥',     role: 'PROJECT_MANAGER', position: '产品运维工程师',       department: '引擎组',     groupId: 'g8',  roles: [] },
      // ID=34 嵌入式组  嵌入式工程师（嵌入式组组长）→ GROUP_LEADER
      { id: 'u34', name: '杨伟杰',   role: 'GROUP_LEADER',    position: '嵌入式工程师（嵌入式组组长）', department: '嵌入式组', groupId: 'g6',  roles: [] },
      // ID=35 嵌入式组  嵌入式工程师
      { id: 'u35', name: '毛存钱',   role: 'PROJECT_MANAGER', position: '嵌入式工程师',         department: '嵌入式组',   groupId: 'g6',  roles: [] },
      // ID=36 硬件组  硬件工程师
      { id: 'u36', name: '朱伟华',   role: 'PROJECT_MANAGER', position: '硬件工程师',           department: '硬件组',     groupId: 'g5',  roles: [] },
      // ID=42 嵌入式组  嵌入式工程师
      { id: 'u42', name: '刘海军',   role: 'PROJECT_MANAGER', position: '嵌入式工程师',         department: '嵌入式组',   groupId: 'g6',  roles: [] },
      // ID=43 嵌入式组  嵌入式工程师
      { id: 'u43', name: '陈俊靖',   role: 'PROJECT_MANAGER', position: '嵌入式工程师',         department: '嵌入式组',   groupId: 'g6',  roles: [] },
      // ID=44 算法组  算法工程师
      { id: 'u44', name: '刘骁哲',   role: 'PROJECT_MANAGER', position: '算法工程师',           department: '算法组',     groupId: 'g3',  roles: [] },
    ],
  });

  // Project
  await prisma.project.create({
    data: {
      id: 'p1',
      name: 'OA 平台升级项目',
    },
  });

  // Iteration
  await prisma.iteration.create({
    data: {
      id: 'iter1',
      projectId: 'p1',
      name: 'Sprint 1 — MVP 交付',
      startDate: new Date('2026-05-04'),
      endDate: new Date('2026-05-15'),
    },
  });

  // Schedules — 为所有在 iteration 中排期的组建立 schedule
  // g12 (算法工程化组) 暂不安排 schedule（成员已并入算法组）
  await prisma.groupSchedule.createMany({
    data: [
      { id: 's3',  iterationId: 'iter1', groupId: 'g3',  status: 'PENDING', version: 1 },
      { id: 's4',  iterationId: 'iter1', groupId: 'g4',  status: 'PENDING', version: 1 },
      { id: 's5',  iterationId: 'iter1', groupId: 'g5',  status: 'PENDING', version: 1 },
      { id: 's6',  iterationId: 'iter1', groupId: 'g6',  status: 'PENDING', version: 1 },
      { id: 's7',  iterationId: 'iter1', groupId: 'g7',  status: 'PENDING', version: 1 },
      { id: 's8',  iterationId: 'iter1', groupId: 'g8',  status: 'PENDING', version: 1 },
      { id: 's9',  iterationId: 'iter1', groupId: 'g9',  status: 'PENDING', version: 1 },
      { id: 's11', iterationId: 'iter1', groupId: 'g11', status: 'PENDING', version: 1 },
    ],
  });

  // Tasks for s4 (软件组)
  const s4Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u3',  startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '模块设计', ownerId: 'u3',  startDate: new Date('2026-05-07'), endDate: new Date('2026-05-08'), durationDays: 2 },
    { orderIndex: 2, name: '编码实现', ownerId: 'u12', startDate: new Date('2026-05-09'), endDate: new Date('2026-05-14'), durationDays: 4 },
    { orderIndex: 3, name: '单元测试', ownerId: 'u14', startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 4, name: '集成部署', ownerId: 'u3',  startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s4Tasks) {
    await prisma.task.create({ data: { scheduleId: 's4', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s3 (算法组) — 组长 u23 范文成，成员 u5,u16,u24,u44
  const s3Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u23', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '算法设计', ownerId: 'u5',  startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: '算法实现', ownerId: 'u16', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '模型训练', ownerId: 'u24', startDate: new Date('2026-05-13'), endDate: new Date('2026-05-14'), durationDays: 2 },
    { orderIndex: 4, name: '上线部署', ownerId: 'u23', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s3Tasks) {
    await prisma.task.create({ data: { scheduleId: 's3', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s5 (硬件组)
  const s5Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u8',  startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '原理设计', ownerId: 'u8',  startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: 'PCB 布线', ownerId: 'u15', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '硬件测试', ownerId: 'u36', startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 4, name: '验收交付', ownerId: 'u8',  startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s5Tasks) {
    await prisma.task.create({ data: { scheduleId: 's5', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s6 (嵌入式组) — 组长 u34 杨伟杰
  const s6Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u34', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '硬件选型', ownerId: 'u34', startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: '驱动开发', ownerId: 'u22', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '固件实现', ownerId: 'u35', startDate: new Date('2026-05-13'), endDate: new Date('2026-05-14'), durationDays: 2 },
    { orderIndex: 4, name: '硬件联调', ownerId: 'u34', startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 5, name: '产品发布', ownerId: 'u34', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s6Tasks) {
    await prisma.task.create({ data: { scheduleId: 's6', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s7 (测试组) — 代理组长 u25 李欢
  const s7Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u25', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '测试计划', ownerId: 'u25', startDate: new Date('2026-05-07'), endDate: new Date('2026-05-08'), durationDays: 2 },
    { orderIndex: 2, name: '测试用例', ownerId: 'u17', startDate: new Date('2026-05-09'), endDate: new Date('2026-05-13'), durationDays: 3 },
    { orderIndex: 3, name: '功能测试', ownerId: 'u10', startDate: new Date('2026-05-13'), endDate: new Date('2026-05-14'), durationDays: 2 },
    { orderIndex: 4, name: '测试报告', ownerId: 'u25', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s7Tasks) {
    await prisma.task.create({ data: { scheduleId: 's7', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s8 (引擎组)
  const s8Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u2',  startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '引擎设计', ownerId: 'u9',  startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: '引擎实现', ownerId: 'u18', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '性能优化', ownerId: 'u26', startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 4, name: '集成验收', ownerId: 'u4',  startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s8Tasks) {
    await prisma.task.create({ data: { scheduleId: 's8', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s9 (项目组)
  const s9Tasks = [
    { orderIndex: 0, name: '项目规划', ownerId: 'u1',  startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '协调启动', ownerId: 'u23', startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: '进度跟踪', ownerId: 'u23', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '评审汇报', ownerId: 'u1',  startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 4, name: '项目收尾', ownerId: 'u23', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s9Tasks) {
    await prisma.task.create({ data: { scheduleId: 's9', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Tasks for s11 (产品组)
  const s11Tasks = [
    { orderIndex: 0, name: '需求收集', ownerId: 'u6',  startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '产品设计', ownerId: 'u7',  startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: '原型评审', ownerId: 'u28', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '需求文档', ownerId: 'u6',  startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 4, name: '移交开发', ownerId: 'u7',  startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];
  for (const t of s11Tasks) {
    await prisma.task.create({ data: { scheduleId: 's11', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Holidays
  await prisma.holiday.createMany({
    data: [
      { date: '2026-05-01', name: '劳动节', year: 2026 },
      { date: '2026-05-02', name: '劳动节假期', year: 2026 },
      { date: '2026-05-03', name: '劳动节假期', year: 2026 },
    ],
  });

  const userCount = await prisma.user.count();
  console.log(`✅ Seed complete: ${userCount} users, 12 groups, 1 project, 1 iteration, 8 schedules, 41 tasks, 3 holidays`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
