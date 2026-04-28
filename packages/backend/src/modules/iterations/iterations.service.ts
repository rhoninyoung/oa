import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class IterationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.iteration.findMany({
      where,
      include: { project: true, schedules: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const iteration = await this.prisma.iteration.findUnique({
      where: { id },
      include: { project: true, schedules: { include: { tasks: true } } },
    });
    if (!iteration) throw new NotFoundException(`Iteration ${id} not found`);
    return iteration;
  }

  async create(data: { projectId: string; name: string; startDate: string; endDate: string }) {
    return this.prisma.iteration.create({
      data: {
        name: data.name,
        projectId: data.projectId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  async update(id: string, data: { name?: string; startDate?: string; endDate?: string }) {
    return this.prisma.iteration.update({
      where: { id },
      data: {
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.iteration.delete({ where: { id } });
  }
}
