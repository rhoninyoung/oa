import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.group.findMany({
      include: { members: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(data: { name: string }) {
    return this.prisma.group.create({
      data: { name: data.name },
    });
  }

  async update(id: string, data: { name?: string }) {
    return this.prisma.group.update({
      where: { id },
      data: { name: data.name },
    });
  }

  async remove(id: string) {
    return this.prisma.group.delete({ where: { id } });
  }
}
