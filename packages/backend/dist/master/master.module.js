"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterModule = void 0;
const common_1 = require("@nestjs/common");
const master_controller_js_1 = require("./master.controller.js");
const master_service_js_1 = require("./master.service.js");
const prisma_service_js_1 = require("../prisma.service.js");
const outbox_module_js_1 = require("../outbox/outbox.module.js");
let MasterModule = class MasterModule {
};
exports.MasterModule = MasterModule;
exports.MasterModule = MasterModule = __decorate([
    (0, common_1.Module)({
        imports: [outbox_module_js_1.OutboxModule],
        controllers: [master_controller_js_1.MasterController],
        providers: [master_service_js_1.MasterService, prisma_service_js_1.PrismaService],
        exports: [master_service_js_1.MasterService],
    })
], MasterModule);
//# sourceMappingURL=master.module.js.map