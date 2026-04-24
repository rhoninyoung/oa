import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';

@Controller('schedules')
export class SchedulesController {
  constructor(@Inject(SchedulesService) private readonly svc: SchedulesService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.findOne(id, userId);
  }

  @Patch(':id/draft')
  saveDraft(
    @Param('id') id: string,
    @Body() body: { tasks: unknown[]; version: number },
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.saveDraft(id, body.tasks, body.version, userId);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.submit(id, userId);
  }

  @Post(':id/withdraw')
  withdraw(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.withdraw(id, userId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.approve(id, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.reject(id, userId, body.reason);
  }

  @Post(':id/reschedule')
  reschedule(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.reschedule(id, userId);
  }
}
