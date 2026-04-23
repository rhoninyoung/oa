import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, userRole: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const whereClause =
      userRole === 'PROJECT_MANAGER'
        ? { AND: [] }
        : { members: { some: { id: userId } } };
    return this.prisma.project.findMany({
      where: whereClause,
      include: {
        iterations: {
          include: {
            schedules: {
              select: { groupId: true, status: true },
            },
          },
        },
      },
    });
  }
}
