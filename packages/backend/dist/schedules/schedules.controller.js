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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulesController = void 0;
const common_1 = require("@nestjs/common");
const schedules_service_js_1 = require("./schedules.service.js");
let SchedulesController = class SchedulesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findOne(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.findOne(id, userId);
    }
    saveDraft(id, body, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.saveDraft(id, body.tasks, body.version, userId);
    }
    submit(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.submit(id, userId);
    }
    withdraw(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.withdraw(id, userId);
    }
    approve(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.approve(id, userId);
    }
    reject(id, body, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.reject(id, userId, body.reason);
    }
    reschedule(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.reschedule(id, userId);
    }
};
exports.SchedulesController = SchedulesController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/draft'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "saveDraft", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/withdraw'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "reschedule", null);
exports.SchedulesController = SchedulesController = __decorate([
    (0, common_1.Controller)('schedules'),
    __param(0, (0, common_1.Inject)(schedules_service_js_1.SchedulesService)),
    __metadata("design:paramtypes", [schedules_service_js_1.SchedulesService])
], SchedulesController);
//# sourceMappingURL=schedules.controller.js.map