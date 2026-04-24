import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { MasterService } from './master.service.js';

@Controller('master')
export class MasterController {
  constructor(@Inject(MasterService) private readonly svc: MasterService) {}

  @Get(':iterationId')
  getMasterView(@Param('iterationId') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.getMasterView(id, userId);
  }

  @Post(':iterationId/rows')
  addRow(
    @Param('iterationId') id: string,
    @Body() body: { ownerId: string },
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.addMasterRow(id, body.ownerId, userId);
  }

  @Delete('rows/:taskId')
  deleteRow(@Param('taskId') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.svc.deleteMasterRow(id, userId);
  }
}
