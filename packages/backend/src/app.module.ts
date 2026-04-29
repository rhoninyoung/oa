import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { SchedulesModule } from './modules/schedules/schedules.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { MasterModule } from './modules/master/master.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { IterationsModule } from './modules/iterations/iterations.module.js';
import { GroupsModule } from './modules/groups/groups.module.js';
import { HolidaysModule } from './modules/holidays/holidays.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';
import { InitModule } from './modules/init/init.module.js';

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
    UsersModule,
    IterationsModule,
    GroupsModule,
    HolidaysModule,
    StatisticsModule,
    InitModule,
  ],
})
export class AppModule {}
