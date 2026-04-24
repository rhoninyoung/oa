"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma.service.js");
let ProjectsService = class ProjectsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return [];
        if (user.role === 'PROJECT_MANAGER') {
            return this.prisma.project.findMany({
                include: {
                    iterations: {
                        include: {
                            schedules: { select: { groupId: true, status: true } },
                        },
                    },
                },
            });
        }
        // GroupLeader: see projects that have schedules for their group
        return this.prisma.project.findMany({
            where: {
                iterations: {
                    some: {
                        schedules: {
                            some: { groupId: user.groupId ?? '' },
                        },
                    },
                },
            },
            include: {
                iterations: {
                    include: {
                        schedules: { select: { groupId: true, status: true } },
                    },
                },
            },
        });
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map