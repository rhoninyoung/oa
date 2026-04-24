import { PrismaService } from '../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import type { Role } from '@oa-mvp/shared';
export declare class SchedulesService {
    private prisma;
    private outbox;
    constructor(prisma: PrismaService, outbox: OutboxService);
    findOne(scheduleId: string, _userId: string): Promise<{
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
    findForIteration(iterationId: string, _userId: string, _userRole: Role): Promise<({
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
    })[]>;
    saveDraft(scheduleId: string, tasks: unknown[], version: number, _userId: string): Promise<{
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
    private getUser;
    submit(scheduleId: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    withdraw(scheduleId: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    approve(scheduleId: string, userId: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reject(scheduleId: string, userId: string, reason: string): Promise<{
        id: string;
        groupId: string;
        iterationId: string;
        status: import("@prisma/client").$Enums.ScheduleStatus;
        version: number;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reschedule(scheduleId: string, userId: string): Promise<{
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
//# sourceMappingURL=schedules.service.d.ts.map