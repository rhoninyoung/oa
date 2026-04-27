// packages/shared/src/schema.ts
// Zod schemas — runtime validation for API boundaries

import { z } from 'zod';

export const RoleSchema = z.enum(['GROUP_LEADER', 'PROJECT_MANAGER']);
export type Role = z.infer<typeof RoleSchema>;

export const ScheduleStatusSchema = z.enum(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED']);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export const TaskSourceSchema = z.enum(['GROUP', 'MASTER']);
export type TaskSource = z.infer<typeof TaskSourceSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  scheduleId: z.string(),
  orderIndex: z.number().int(),
  name: z.string(),
  ownerId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  durationDays: z.number().int().nullable().optional(),
  dependencyTaskId: z.string().nullable().optional(),
  source: TaskSourceSchema,
  note: z.string().nullable().optional(),
});

export const GroupScheduleSchema = z.object({
  id: z.string(),
  iterationId: z.string(),
  groupId: z.string(),
  status: ScheduleStatusSchema,
  version: z.number().int(),
  rejectReason: z.string().nullable().optional(),
});

export const TransitionContextSchema = z.object({
  tasks: z.array(TaskSchema),
  reason: z.string().optional(),
});

export const SaveDraftSchema = z.object({
  tasks: z.array(TaskSchema),
  version: z.number().int(),
});

export const RejectSchema = z.object({
  reason: z.string().min(1).max(200),
});
