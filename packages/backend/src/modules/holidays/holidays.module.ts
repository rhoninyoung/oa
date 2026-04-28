import { Module } from '@nestjs/common';
import { HolidaysController } from './holidays.controller.js';
import { HolidaysService } from './holidays.service.js';

@Module({
  controllers: [HolidaysController],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
