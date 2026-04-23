import { MasterService } from './master.service.js';
export declare class MasterController {
    private readonly svc;
    constructor(svc: MasterService);
    private getUserId;
    getMasterView(id: string, headers: Headers): Promise<{
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
    addRow(id: string, body: {
        ownerId: string;
    }, headers: Headers): Promise<{
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
    deleteRow(id: string, headers: Headers): Promise<{
        deleted: boolean;
    }>;
}
//# sourceMappingURL=master.controller.d.ts.map