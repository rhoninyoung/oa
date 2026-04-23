import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.notificationOutbox.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupSchedule.deleteMany();
  await prisma.iteration.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();

  // Create groups
  const g1 = await prisma.group.create({ data: { id: 'g1', name: '前端组' } });
  const g2 = await prisma.group.create({ data: { id: 'g2', name: '后端组' } });

  // Create users
  const u1 = await prisma.user.create({
    data: { id: 'u1', name: '胡孟瑶', role: 'GROUP_LEADER', groupId: g1.id },
  });
  const u2 = await prisma.user.create({
    data: { id: 'u2', name: '陈思远', role: 'GROUP_LEADER', groupId: g2.id },
  });
  const p1 = await prisma.user.create({
    data: { id: 'p1', name: '王架构', role: 'PROJECT_MANAGER', groupId: null },
  });

  // Create project & iteration
  const project = await prisma.project.create({
    data: { id: 'proj-1', name: 'OA 平台' },
  });

  const iter = await prisma.iteration.create({
    data: {
      id: 'iter-1',
      projectId: project.id,
      name: '2026-Q2 迭代',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
    },
  });

  // Create GroupSchedules (PENDING for both groups)
  for (const [gid, uid] of [['g1', 'u1'], ['g2', 'u2']] as const) {
    const schedule = await prisma.groupSchedule.create({
      data: {
        id: `sch-${gid}`,
        iterationId: iter.id,
        groupId: gid,
        status: 'PENDING',
        version: 1,
      },
    });

    // Seed 3 empty task rows
    for (let i = 1; i <= 3; i++) {
      await prisma.task.create({
        data: {
          id: `task-${gid}-${i}`,
          scheduleId: schedule.id,
          orderIndex: i,
          name: '',
          source: 'GROUP',
        },
      });
    }
  }

  console.log('Seed complete: 1 project, 1 iteration, 2 groups, 2 GLs, 1 PM');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
