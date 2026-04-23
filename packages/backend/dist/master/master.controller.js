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
exports.MasterController = void 0;
const common_1 = require("@nestjs/common");
let MasterController = class MasterController {
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
    getMasterView(id, headers) {
        return this.svc.getMasterView(id, this.getUserId(headers));
    }
    addRow(id, body, headers) {
        return this.svc.addMasterRow(id, body.ownerId, this.getUserId(headers));
    }
    deleteRow(id, headers) {
        return this.svc.deleteMasterRow(id, this.getUserId(headers));
    }
};
exports.MasterController = MasterController;
__decorate([
    (0, common_1.Get)(':iterationId'),
    __param(0, (0, common_1.Param)('iterationId')),
    __param(1, (0, common_1.Headers)())
], MasterController.prototype, "getMasterView", null);
__decorate([
    (0, common_1.Post)(':iterationId/rows'),
    __param(0, (0, common_1.Param)('iterationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)())
], MasterController.prototype, "addRow", null);
__decorate([
    (0, common_1.Delete)('rows/:taskId'),
    __param(0, (0, common_1.Param)('taskId')),
    __param(1, (0, common_1.Headers)())
], MasterController.prototype, "deleteRow", null);
exports.MasterController = MasterController = __decorate([
    (0, common_1.Controller)('master')
], MasterController);
//# sourceMappingURL=master.controller.js.map