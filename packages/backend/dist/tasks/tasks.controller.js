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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const tasks_service_js_1 = require("./tasks.service.js");
let TasksController = class TasksController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    insertRow(scheduleId, body, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.insertRow(scheduleId, body.afterIndex, userId);
    }
    deleteRow(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.deleteRow(id, userId);
    }
    updateTask(id, body, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.updateTask(id, body, userId);
    }
    setDependency(id, body, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.setDependency(id, body.dependencyTaskId, userId);
    }
    propagate(id) {
        return this.svc.propagateFinishChange(id);
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Post)(':id/rows'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "insertRow", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deleteRow", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "updateTask", null);
__decorate([
    (0, common_1.Put)(':id/dependency'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "setDependency", null);
__decorate([
    (0, common_1.Post)(':id/propagate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "propagate", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.Controller)('tasks'),
    __param(0, (0, common_1.Inject)(tasks_service_js_1.TasksService)),
    __metadata("design:paramtypes", [tasks_service_js_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map