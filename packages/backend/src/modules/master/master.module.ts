import { Module } from '@nestjs/common';
import { MasterController } from './master.controller.js';
import { MasterService } from './master.service.js';

@Module({
  controllers: [MasterController],
  providers: [MasterService],
  exports: [MasterService],
})
export class MasterModule {}
