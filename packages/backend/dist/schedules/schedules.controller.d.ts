import { SchedulesService } from './schedules.service.js';
export declare class SchedulesController {
    private readonly svc;
    constructor(svc: SchedulesService);
    private getUserId;
    findOne(id: string, headers: Headers): Promise<{
        tasks: {
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
        }[];
    } & {
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    saveDraft(id: string, body: {
        tasks: unknown[];
        version: number;
    }, headers: Headers): Promise<{
        newVersion: number;
        tasks: {
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
        }[];
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    submit(id: string, headers: Headers): Promise<{
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    withdraw(id: string, headers: Headers): Promise<{
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    approve(id: string, headers: Headers): Promise<{
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reject(id: string, body: {
        reason: string;
    }, headers: Headers): Promise<{
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reschedule(id: string, headers: Headers): Promise<{
        id: string;
        iterationId: string;
        groupId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=schedules.controller.d.ts.map