import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: { group: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { group: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(data: { name: string; email?: string; role: string; groupId?: string }) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role as any,
        groupId: data.groupId,
      },
    });
  }

  async update(id: string, data: { name?: string; email?: string; role?: string; groupId?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role as any,
        groupId: data.groupId,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
