"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const projects_module_js_1 = require("./projects/projects.module.js");
const schedules_module_js_1 = require("./schedules/schedules.module.js");
const tasks_module_js_1 = require("./tasks/tasks.module.js");
const master_module_js_1 = require("./master/master.module.js");
const outbox_module_js_1 = require("./outbox/outbox.module.js");
const exports_module_js_1 = require("./exports/exports.module.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            projects_module_js_1.ProjectsModule,
            schedules_module_js_1.SchedulesModule,
            tasks_module_js_1.TasksModule,
            master_module_js_1.MasterModule,
            outbox_module_js_1.OutboxModule,
            exports_module_js_1.ExportsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map