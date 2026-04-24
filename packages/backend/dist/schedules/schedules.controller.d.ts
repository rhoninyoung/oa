import { SchedulesService } from './schedules.service.js';
export declare class SchedulesController {
    private readonly svc;
    constructor(svc: SchedulesService);
    findOne(id: string, userId: string): Promise<{
        tasks: {
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
        }[];
    } & {
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    saveDraft(id: string, body: {
        tasks: unknown[];
        version: number;
    }, userId: string): Promise<{
        newVersion: number;
        tasks: {
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
        }[];
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    submit(id: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    withdraw(id: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    approve(id: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reject(id: string, body: {
        reason: string;
    }, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reschedule(id: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=schedules.controller.d.ts.map