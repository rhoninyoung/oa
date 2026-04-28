import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { HolidaysService } from './holidays.service.js';

@Controller('api/holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  async findAll(@Query('year') year?: string) {
    return this.holidaysService.findAll(year ? parseInt(year, 10) : undefined);
  }

  @Post()
  async create(@Body() body: { date: string; name: string; lunarDate?: string; year: number }) {
    return this.holidaysService.create(body);
  }

  @Post('bulk')
  async bulkCreate(@Body() body: Array<{ date: string; name: string; lunarDate?: string; year: number }>) {
    return this.holidaysService.bulkCreate(body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
