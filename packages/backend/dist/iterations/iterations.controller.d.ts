import { SchedulesService } from '../schedules/schedules.service.js';
export declare class IterationsController {
    private readonly schedulesService;
    constructor(schedulesService: SchedulesService);
    findOne(id: string, userId: string): Promise<({
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
}
//# sourceMappingURL=iterations.controller.d.ts.map