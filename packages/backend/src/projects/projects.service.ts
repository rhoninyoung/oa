import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];
    if (user.role === 'PROJECT_MANAGER') {
      return this.prisma.project.findMany({
        include: {
          iterations: {
            include: {
              schedules: { select: { groupId: true, status: true } },
            },
          },
        },
      });
    }
    // GroupLeader: see projects that have schedules for their group
    return this.prisma.project.findMany({
      where: {
        iterations: {
          some: {
            schedules: {
              some: { groupId: user.groupId ?? '' },
            },
          },
        },
      },
      include: {
        iterations: {
          include: {
            schedules: { select: { groupId: true, status: true } },
          },
        },
      },
    });
  }
}
