import { MasterService } from './master.service.js';
export declare class MasterController {
    private readonly svc;
    constructor(svc: MasterService);
    getMasterView(id: string, userId: string): Promise<{
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
    addRow(id: string, body: {
        ownerId: string;
    }, userId: string): Promise<{
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
    deleteRow(id: string, userId: string): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=master.controller.d.ts.map