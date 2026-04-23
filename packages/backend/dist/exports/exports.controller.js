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
exports.ExportsController = void 0;
const common_1 = require("@nestjs/common");
let ExportsController = class ExportsController {
    // Stub: returns a minimal xlsx-like buffer (real impl later)
    async exportXlsx(_id, userId, res) {
        if (!userId)
            throw new common_1.UnauthorizedException();
        // TODO: real xlsx generation
        const buf = Buffer.from('PK\x03\x04placeholder-xlsx');
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="export.xlsx"`,
        });
        res.end(buf);
    }
};
exports.ExportsController = ExportsController;
__decorate([
    (0, common_1.Get)('iterations/:id.xlsx'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __param(2, (0, common_1.Res)())
], ExportsController.prototype, "exportXlsx", null);
exports.ExportsController = ExportsController = __decorate([
    (0, common_1.Controller)('exports')
], ExportsController);
//# sourceMappingURL=exports.controller.js.map