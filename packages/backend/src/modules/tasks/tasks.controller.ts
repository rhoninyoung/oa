import { Controller, Post, Delete, Put, Patch, Param, Body, Headers } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post(':id/rows')
  async insertRow(
    @Param('id') scheduleId: string,
    @Body() body: { afterIndex: number },
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.insertRow(scheduleId, body.afterIndex, userId);
  }

  @Delete(':id')
  async deleteRow(@Param('id') taskId: string, @Headers('x-user-id') userId: string) {
    return this.tasksService.deleteRow(taskId, userId);
  }

  @Put(':id/dependency')
  async setDependency(
    @Param('id') taskId: string,
    @Body() body: { dependencyTaskId: string | null },
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.setDependency(taskId, body.dependencyTaskId, userId);
  }

  @Post(':id/propagate')
  async propagate(@Param('id') taskId: string, @Headers('x-user-id') userId: string) {
    return this.tasksService.propagate(taskId, userId);
  }

  @Patch(':id/progress')
  async updateProgress(
    @Param('id') taskId: string,
    @Body() body: { progress: number },
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.updateProgress(taskId, body.progress, userId);
  }

  @Patch(':id')
  async updateTask(
    @Param('id') taskId: string,
    @Body() body: Record<string, any>,
    @Headers('x-user-id') userId: string,
  ) {
    return this.tasksService.updateTask(taskId, body, userId);
  }
}
