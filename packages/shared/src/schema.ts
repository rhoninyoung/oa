import { z } from 'zod';

// ── Primitives ─────────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['GROUP_LEADER', 'PROJECT_MANAGER']);
export const ScheduleStatusSchema = z.enum(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED']);
export const TaskSourceSchema = z.enum(['GROUP', 'MASTER']);

// ── Entities ─────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: RoleSchema,
  groupId: z.string().nullable(),
});

export const TaskSchema = z.object({
  id: z.string(),
  scheduleId: z.string(),
  orderIndex: z.number().int().nonnegative(),
  name: z.string(),
  ownerId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  durationDays: z.number().int().nonnegative().nullable(),
  dependencyTaskId: z.string().nullable(),
  source: TaskSourceSchema.default('GROUP'),
});

export const GroupScheduleSchema = z.object({
  id: z.string(),
  iterationId: z.string(),
  groupId: z.string(),
  status: ScheduleStatusSchema,
  version: z.number().int().positive(),
  rejectReason: z.string().nullable(),
  tasks: z.array(TaskSchema),
});

export const DraftPatchSchema = z.object({
  tasks: z.array(TaskSchema),
  version: z.number().int().positive(),
});

export type { DraftPatch } from './types.js';
