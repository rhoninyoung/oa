import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(year?: number) {
    const where = year ? { year } : {};
    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async create(data: { date: string; name: string; lunarDate?: string; year: number }) {
    return this.prisma.holiday.create({
      data: {
        date: data.date,
        name: data.name,
        lunarDate: data.lunarDate,
        year: data.year,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.holiday.delete({ where: { id } });
  }

  async bulkCreate(holidays: Array<{ date: string; name: string; lunarDate?: string; year: number }>) {
    // Delete existing holidays for the year, then insert new ones
    const year = holidays[0]?.year;
    if (!year) return [];

    await this.prisma.holiday.deleteMany({ where: { year } });
    return this.prisma.holiday.createMany({
      data: holidays.map(h => ({
        date: h.date,
        name: h.name,
        lunarDate: h.lunarDate,
        year: h.year,
      })),
    });
  }
}
