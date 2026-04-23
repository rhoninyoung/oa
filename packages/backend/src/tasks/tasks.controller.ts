import {
  Controller, Post, Delete, Patch, Put, Param, Body, Headers, UnauthorizedException,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  private getUserId(headers: Headers) {
    const uid = headers.get('x-user-id') ?? undefined;
    if (!uid) throw new UnauthorizedException();
    return uid;
  }

  @Post(':id/rows')
  insertRow(
    @Param('id') scheduleId: string,
    @Body() body: { afterIndex: number },
    @Headers() headers: Headers,
  ) {
    return this.svc.insertRow(scheduleId, body.afterIndex, this.getUserId(headers));
  }

  @Delete(':id')
  deleteRow(@Param('id') id: string, @Headers() headers: Headers) {
    return this.svc.deleteRow(id, this.getUserId(headers));
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Headers,
  ) {
    return this.svc.findOne(id); // placeholder
  }

  @Put(':id/dependency')
  setDependency(
    @Param('id') id: string,
    @Body() body: { dependencyTaskId: string | null },
    @Headers() headers: Headers,
  ) {
    return this.svc.setDependency(id, body.dependencyTaskId, this.getUserId(headers));
  }

  @Post(':id/propagate')
  propagate(@Param('id') id: string) {
    return this.svc.propagateFinishChange(id);
  }
}
