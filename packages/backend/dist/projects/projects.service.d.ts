import { PrismaService } from '../prisma.service.js';
export declare class ProjectsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string, userRole: string): Promise<({
        iterations: ({
            schedules: {
                groupId: string;
                status: import("@prisma/client").$Enums.ScheduleStatus;
            }[];
        } & {
            id: string;
            name: string;
            projectId: string;
            startDate: Date;
            endDate: Date;
        })[];
    } & {
        id: string;
        name: string;
    })[]>;
}
//# sourceMappingURL=projects.service.d.ts.map