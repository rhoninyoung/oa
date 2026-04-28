import { Module } from '@nestjs/common';
import { IterationsController } from './iterations.controller.js';
import { IterationsService } from './iterations.service.js';

@Module({
  controllers: [IterationsController],
  providers: [IterationsService],
  exports: [IterationsService],
})
export class IterationsModule {}
