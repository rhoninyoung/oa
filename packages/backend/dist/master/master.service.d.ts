import { PrismaService } from '../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
export declare class MasterService {
    private prisma;
    private outbox;
    constructor(prisma: PrismaService, outbox: OutboxService);
    getMasterView(iterationId: string, userId: string): Promise<{
        id: string;
        source: import("@prisma/client").$Enums.TaskSource;
        orderIndex: number;
        name: string;
        scheduleId: string;
        ownerId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        durationDays: number | null;
        dependencyTaskId: string | null;
    }[]>;
    addMasterRow(iterationId: string, ownerId: string, userId: string): Promise<{
        id: string;
        source: import("@prisma/client").$Enums.TaskSource;
        orderIndex: number;
        name: string;
        scheduleId: string;
        ownerId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        durationDays: number | null;
        dependencyTaskId: string | null;
    }>;
    deleteMasterRow(taskId: string, userId: string): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=master.service.d.ts.map