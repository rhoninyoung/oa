import { Controller, Get, Query } from '@nestjs/common';
import { InitService } from './init.service.js';

@Controller('init')
export class InitController {
  constructor(private readonly initService: InitService) {}

  @Get()
  async getInitData(@Query('userId') userId: string) {
    return this.initService.getInitData(userId ?? '');
  }
}
