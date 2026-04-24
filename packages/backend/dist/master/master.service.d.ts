import { PrismaService } from '../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
export declare class MasterService {
    private prisma;
    private outbox;
    constructor(prisma: PrismaService, outbox: OutboxService);
    getMasterView(iterationId: string, _userId: string): Promise<{
        id: string;
        name: string;
        startDate: Date | null;
        endDate: Date | null;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        durationDays: number | null;
        dependencyTaskId: string | null;
        source: import("@prisma/client").$Enums.TaskSource;
    }[]>;
    addMasterRow(iterationId: string, ownerId: string, userId: string): Promise<{
        id: string;
        name: string;
        startDate: Date | null;
        endDate: Date | null;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        durationDays: number | null;
        dependencyTaskId: string | null;
        source: import("@prisma/client").$Enums.TaskSource;
    }>;
    deleteMasterRow(taskId: string, userId: string): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=master.service.d.ts.map