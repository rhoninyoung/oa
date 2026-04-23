import { Controller, Get, Post, Delete, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { MasterService } from './master.service.js';

@Controller('master')
export class MasterController {
  constructor(private readonly svc: MasterService) {}

  private getUserId(headers: Headers) {
    const uid = headers.get('x-user-id') ?? undefined;
    if (!uid) throw new UnauthorizedException();
    return uid;
  }

  @Get(':iterationId')
  getMasterView(@Param('iterationId') id: string, @Headers() headers: Headers) {
    return this.svc.getMasterView(id, this.getUserId(headers));
  }

  @Post(':iterationId/rows')
  addRow(
    @Param('iterationId') id: string,
    @Body() body: { ownerId: string },
    @Headers() headers: Headers,
  ) {
    return this.svc.addMasterRow(id, body.ownerId, this.getUserId(headers));
  }

  @Delete('rows/:taskId')
  deleteRow(@Param('taskId') id: string, @Headers() headers: Headers) {
    return this.svc.deleteMasterRow(id, this.getUserId(headers));
  }
}
