import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { SchedulesModule } from './modules/schedules/schedules.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { MasterModule } from './modules/master/master.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    SchedulesModule,
    TasksModule,
    MasterModule,
    OutboxModule,
    HealthModule,
    NotificationsModule,
  ],
})
export class AppModule {}
