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
exports.MasterController = void 0;
const common_1 = require("@nestjs/common");
const master_service_js_1 = require("./master.service.js");
let MasterController = class MasterController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    getMasterView(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.getMasterView(id, userId);
    }
    addRow(id, body, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.addMasterRow(id, body.ownerId, userId);
    }
    deleteRow(id, userId) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        return this.svc.deleteMasterRow(id, userId);
    }
};
exports.MasterController = MasterController;
__decorate([
    (0, common_1.Get)(':iterationId'),
    __param(0, (0, common_1.Param)('iterationId')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MasterController.prototype, "getMasterView", null);
__decorate([
    (0, common_1.Post)(':iterationId/rows'),
    __param(0, (0, common_1.Param)('iterationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], MasterController.prototype, "addRow", null);
__decorate([
    (0, common_1.Delete)('rows/:taskId'),
    __param(0, (0, common_1.Param)('taskId')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MasterController.prototype, "deleteRow", null);
exports.MasterController = MasterController = __decorate([
    (0, common_1.Controller)('master'),
    __param(0, (0, common_1.Inject)(master_service_js_1.MasterService)),
    __metadata("design:paramtypes", [master_service_js_1.MasterService])
], MasterController);
//# sourceMappingURL=master.controller.js.map