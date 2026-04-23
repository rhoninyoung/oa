import { TasksService } from './tasks.service.js';
export declare class TasksController {
    private readonly svc;
    constructor(svc: TasksService);
    private getUserId;
    insertRow(scheduleId: string, body: {
        afterIndex: number;
    }, headers: Headers): Promise<{
        id: string;
        orderIndex: number;
        name: string;
        scheduleId: string;
        ownerId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        durationDays: number | null;
        dependencyTaskId: string | null;
        source: import("@prisma/client").$Enums.TaskSource;
    }>;
    deleteRow(id: string, headers: Headers): Promise<{
        deleted: boolean;
    }>;
    updateTask(id: string, body: Record<string, unknown>, headers: Headers): Promise<{
        id: string;
        orderIndex: number;
        name: string;
        scheduleId: string;
        ownerId: string | null;
        startDate: Date | null;
        endDate: Date | null;
        durationDays: number | null;
        dependencyTaskId: string | null;
        source: import("@prisma/client").$Enums.TaskSource;
    }>;
    setDependency(id: string, body: {
        dependencyTaskId: string | null;
    }, headers: Headers): Promise<{
        ok: boolean;
    }>;
    propagate(id: string): Promise<{
        affectedTaskIds: string[];
    }>;
}
//# sourceMappingURL=tasks.controller.d.ts.map