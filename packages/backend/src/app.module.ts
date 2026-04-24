import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { MasterModule } from './master/master.module.js';
import { OutboxModule } from './outbox/outbox.module.js';
import { ExportsModule } from './exports/exports.module.js';
import { IterationsModule } from './iterations/iterations.module.js';

@Module({
  imports: [
    ProjectsModule,
    SchedulesModule,
    TasksModule,
    MasterModule,
    OutboxModule,
    ExportsModule,
    IterationsModule,
  ],
})
export class AppModule {}
