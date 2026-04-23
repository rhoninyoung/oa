"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftPatchSchema = exports.GroupScheduleSchema = exports.TaskSchema = exports.UserSchema = exports.TaskSourceSchema = exports.ScheduleStatusSchema = exports.RoleSchema = void 0;
const zod_1 = require("zod");
// ── Primitives ─────────────────────────────────────────────────────────────────
exports.RoleSchema = zod_1.z.enum(['GROUP_LEADER', 'PROJECT_MANAGER']);
exports.ScheduleStatusSchema = zod_1.z.enum(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED']);
exports.TaskSourceSchema = zod_1.z.enum(['GROUP', 'MASTER']);
// ── Entities ─────────────────────────────────────────────────────────────────
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    role: exports.RoleSchema,
    groupId: zod_1.z.string().nullable(),
});
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    scheduleId: zod_1.z.string(),
    orderIndex: zod_1.z.number().int().nonnegative(),
    name: zod_1.z.string(),
    ownerId: zod_1.z.string().nullable(),
    startDate: zod_1.z.string().nullable(),
    endDate: zod_1.z.string().nullable(),
    durationDays: zod_1.z.number().int().nonnegative().nullable(),
    dependencyTaskId: zod_1.z.string().nullable(),
    source: exports.TaskSourceSchema.default('GROUP'),
});
exports.GroupScheduleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    iterationId: zod_1.z.string(),
    groupId: zod_1.z.string(),
    status: exports.ScheduleStatusSchema,
    version: zod_1.z.number().int().positive(),
    rejectReason: zod_1.z.string().nullable(),
    tasks: zod_1.z.array(exports.TaskSchema),
});
exports.DraftPatchSchema = zod_1.z.object({
    tasks: zod_1.z.array(exports.TaskSchema),
    version: zod_1.z.number().int().positive(),
});
//# sourceMappingURL=schema.js.map