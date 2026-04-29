import { Module } from '@nestjs/common';
import { InitController } from './init.controller.js';
import { InitService } from './init.service.js';

@Module({
  controllers: [InitController],
  providers: [InitService],
})
export class InitModule {}
