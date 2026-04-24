import { PrismaService } from '../prisma.service.js';
export declare class TasksService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(taskId: string): Promise<{
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
    updateTask(taskId: string, data: Record<string, unknown>, _userId: string): Promise<{
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
    insertRow(scheduleId: string, afterIndex: number, _userId: string): Promise<{
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
    deleteRow(taskId: string, _userId: string): Promise<{
        deleted: boolean;
    }>;
    setDependency(taskId: string, depId: string | null, _userId: string): Promise<{
        ok: boolean;
    }>;
    propagateFinishChange(taskId: string): Promise<{
        affectedTaskIds: string[];
    }>;
}
//# sourceMappingURL=tasks.service.d.ts.map