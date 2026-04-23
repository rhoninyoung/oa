import { ProjectsService } from './projects.service.js';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    findAll(userId: string): Promise<({
        iterations: ({
            schedules: {
                groupId: string;
                status: import("@prisma/client").$Enums.ScheduleStatus;
            }[];
        } & {
            id: string;
            name: string;
            projectId: string;
            startDate: Date;
            endDate: Date;
        })[];
    } & {
        id: string;
        name: string;
    })[]>;
}
//# sourceMappingURL=projects.controller.d.ts.map