import { TasksService } from './tasks.service.js';
export declare class TasksController {
    private readonly svc;
    constructor(svc: TasksService);
    insertRow(scheduleId: string, body: {
        afterIndex: number;
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
    updateTask(id: string, body: Record<string, unknown>, userId: string): Promise<{
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
    setDependency(id: string, body: {
        dependencyTaskId: string | null;
    }, userId: string): Promise<{
        ok: boolean;
    }>;
    propagate(id: string): Promise<{
        affectedTaskIds: string[];
    }>;
}
//# sourceMappingURL=tasks.controller.d.ts.map