// packages/backend/prisma/seed.ts
// Mirrors src/seed.js — same data, same IDs, seeded into PostgreSQL

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.notificationOutbox.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupSchedule.deleteMany();
  await prisma.iteration.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();

  // Groups
  await prisma.group.createMany({
    data: [
      { id: 'g1', name: '前端组' },
      { id: 'g2', name: '后端组' },
    ],
  });

  // Users
  await prisma.user.createMany({
    data: [
      { id: 'u_gl1', name: '组长-张三', role: 'GROUP_LEADER', groupId: 'g1' },
      { id: 'u_gl2', name: '组长-李四', role: 'GROUP_LEADER', groupId: 'g2' },
      { id: 'u_pm',  name: 'PM-王五',  role: 'PROJECT_MANAGER', groupId: null },
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

  // Schedules
  await prisma.groupSchedule.createMany({
    data: [
      { id: 's1', iterationId: 'iter1', groupId: 'g1', status: 'PENDING', version: 1 },
      { id: 's2', iterationId: 'iter1', groupId: 'g2', status: 'PENDING', version: 1 },
    ],
  });

  // Tasks for s1 (前端组)
  const s1Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u_gl1', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: 'UI 设计',   ownerId: 'u_gl1', startDate: new Date('2026-05-07'), endDate: new Date('2026-05-09'), durationDays: 3 },
    { orderIndex: 2, name: '前端开发', ownerId: 'u_gl1', startDate: new Date('2026-05-10'), endDate: new Date('2026-05-14'), durationDays: 3 },
    { orderIndex: 3, name: '联调测试', ownerId: 'u_gl1', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
    { orderIndex: 4, name: '上线部署', ownerId: 'u_gl1', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];

  // Tasks for s2 (后端组)
  const s2Tasks = [
    { orderIndex: 0, name: '需求分析', ownerId: 'u_gl2', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-06'), durationDays: 3 },
    { orderIndex: 1, name: '架构设计', ownerId: 'u_gl2', startDate: new Date('2026-05-07'), endDate: new Date('2026-05-08'), durationDays: 2 },
    { orderIndex: 2, name: '后端开发', ownerId: 'u_gl2', startDate: new Date('2026-05-09'), endDate: new Date('2026-05-14'), durationDays: 4 },
    { orderIndex: 3, name: '接口联调', ownerId: 'u_gl2', startDate: new Date('2026-05-14'), endDate: new Date('2026-05-15'), durationDays: 2 },
    { orderIndex: 4, name: '部署上线', ownerId: 'u_gl2', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-15'), durationDays: 1 },
  ];

  for (const t of s1Tasks) {
    await prisma.task.create({ data: { scheduleId: 's1', ...t, source: 'GROUP', progressPercent: 0 } });
  }
  for (const t of s2Tasks) {
    await prisma.task.create({ data: { scheduleId: 's2', ...t, source: 'GROUP', progressPercent: 0 } });
  }

  // Holidays (mirrors src/seed.js)
  await prisma.holiday.createMany({
    data: [
      { date: '2026-05-01', name: '劳动节', year: 2026 },
      { date: '2026-05-02', name: '劳动节假期', year: 2026 },
      { date: '2026-05-03', name: '劳动节假期', year: 2026 },
    ],
  });

  console.log('✅ Seed complete: 3 users, 2 groups, 1 project, 1 iteration, 2 schedules, 10 tasks, 3 holidays');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
