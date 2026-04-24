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
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma.service.js");
let OutboxService = class OutboxService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Build a stable idempotency key from event context. */
    buildKey(type, scheduleId, action, version) {
        return `${type}|${scheduleId}|${action}|${version}`;
    }
    /** Emit a notification event. */
    async emit(type, payload) {
        const version = payload['version'] ?? 1;
        const scheduleId = payload['scheduleId'] ?? '';
        const action = payload['action'] ?? type;
        const key = this.buildKey(type, scheduleId, action, version);
        // Upsert: keep only the latest undispatched entry per key
        const payloadJson = payload;
        await this.prisma.notificationOutbox.upsert({
            where: { idempotencyKey: key },
            create: { idempotencyKey: key, type, payload: payloadJson },
            update: { payload: payloadJson, dispatchedAt: null },
        });
        console.log('[Outbox emit]', JSON.stringify({ type, payload, at: new Date().toISOString() }));
    }
    /** Dismiss pending notifications for a given event (e.g. on withdraw). */
    async dismissPendingForEvent(type, scheduleId) {
        await this.prisma.notificationOutbox.updateMany({
            where: { type, payload: { path: ['scheduleId'], equals: scheduleId }, dispatchedAt: null },
            data: { dispatchedAt: new Date() },
        });
    }
    /** Worker tick: mark dispatched. */
    async dispatchAll() {
        const pending = await this.prisma.notificationOutbox.findMany({
            where: { dispatchedAt: null },
        });
        for (const entry of pending) {
            console.log('[Outbox dispatch]', JSON.stringify({ type: entry.type, payload: entry.payload, at: new Date().toISOString() }));
            await this.prisma.notificationOutbox.update({
                where: { id: entry.id },
                data: { dispatchedAt: new Date() },
            });
        }
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map