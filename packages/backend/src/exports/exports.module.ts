import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  controllers: [ExportsController],
  providers: [PrismaService],
})
export class ExportsModule {}
