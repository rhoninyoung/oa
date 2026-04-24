import {
  Controller,
  Post,
  Delete,
  Patch,
  Put,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(@Inject(TasksService) private readonly svc: TasksService) {}

  @Post(':id/rows')
  insertRow(
    @Param('id') scheduleId: string,
    @Body() body: { afterIndex: number },
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.insertRow(scheduleId, body.afterIndex, userId);
  }

  @Delete(':id')
  deleteRow(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.deleteRow(id, userId);
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.updateTask(id, body, userId);
  }

  @Put(':id/dependency')
  setDependency(
    @Param('id') id: string,
    @Body() body: { dependencyTaskId: string | null },
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.setDependency(id, body.dependencyTaskId, userId);
  }

  @Post(':id/propagate')
  propagate(@Param('id') id: string) {
    return this.svc.propagateFinishChange(id);
  }
}
