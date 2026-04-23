"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulesController = void 0;
const common_1 = require("@nestjs/common");
let SchedulesController = class SchedulesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    getUserId(headers) {
        const uid = headers.get('x-user-id') ?? undefined;
        if (!uid)
            throw new common_1.UnauthorizedException();
        return uid;
    }
    findOne(id, headers) {
        return this.svc.findOne(id, this.getUserId(headers));
    }
    saveDraft(id, body, headers) {
        return this.svc.saveDraft(id, body.tasks, body.version, this.getUserId(headers));
    }
    submit(id, headers) {
        return this.svc.submit(id, this.getUserId(headers));
    }
    withdraw(id, headers) {
        return this.svc.withdraw(id, this.getUserId(headers));
    }
    approve(id, headers) {
        return this.svc.approve(id, this.getUserId(headers));
    }
    reject(id, body, headers) {
        return this.svc.reject(id, this.getUserId(headers), body.reason);
    }
    reschedule(id, headers) {
        return this.svc.reschedule(id, this.getUserId(headers));
    }
};
exports.SchedulesController = SchedulesController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)())
], SchedulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/draft'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)())
], SchedulesController.prototype, "saveDraft", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)())
], SchedulesController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/withdraw'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)())
], SchedulesController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)())
], SchedulesController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)())
], SchedulesController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/reschedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)())
], SchedulesController.prototype, "reschedule", null);
exports.SchedulesController = SchedulesController = __decorate([
    (0, common_1.Controller)('schedules')
], SchedulesController);
//# sourceMappingURL=schedules.controller.js.map