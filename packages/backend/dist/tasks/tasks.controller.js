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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
let TasksController = class TasksController {
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
    insertRow(scheduleId, body, headers) {
        return this.svc.insertRow(scheduleId, body.afterIndex, this.getUserId(headers));
    }
    deleteRow(id, headers) {
        return this.svc.deleteRow(id, this.getUserId(headers));
    }
    updateTask(id, body, headers) {
        return this.svc.findOne(id); // placeholder
    }
    setDependency(id, body, headers) {
        return this.svc.setDependency(id, body.dependencyTaskId, this.getUserId(headers));
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
    __param(2, (0, common_1.Headers)())
], TasksController.prototype, "insertRow", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)())
], TasksController.prototype, "deleteRow", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)())
], TasksController.prototype, "updateTask", null);
__decorate([
    (0, common_1.Put)(':id/dependency'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)())
], TasksController.prototype, "setDependency", null);
__decorate([
    (0, common_1.Post)(':id/propagate'),
    __param(0, (0, common_1.Param)('id'))
], TasksController.prototype, "propagate", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.Controller)('tasks')
], TasksController);
//# sourceMappingURL=tasks.controller.js.map