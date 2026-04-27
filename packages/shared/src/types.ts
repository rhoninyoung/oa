// packages/shared/src/types.ts
// TypeScript types — mirror Prisma schema + domain models

export type Role = 'GROUP_LEADER' | 'PROJECT_MANAGER';
export type ScheduleStatus = 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED';
export type TaskSource = 'GROUP' | 'MASTER';

export interface User {
  id: string;
  name: string;
  role: Role;
  groupId: string | null;
}

export interface Group {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Iteration {
  id: string;
  projectId: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface GroupSchedule {
  id: string;
  iterationId: string;
  groupId: string;
  status: ScheduleStatus;
  version: number;
  rejectReason?: string | null;
  tasks?: Task[];
}

export interface Task {
  id: string;
  scheduleId: string;
  orderIndex: number;
  name: string;
  ownerId?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  durationDays?: number | null;
  dependencyTaskId?: string | null;
  source: TaskSource;
  note?: string | null;
}

export interface ApprovalRecord {
  id: string;
  scheduleId: string;
  reviewerId: string;
  action: string;
  reason?: string | null;
  createdAt: Date;
}

export interface NotificationOutbox {
  id: string;
  idempotencyKey: string;
  type: string;
  payload: Record<string, unknown>;
  dispatchedAt?: Date | null;
  createdAt: Date;
}

export type Action = 'submit' | 'withdraw' | 'approve' | 'reject' | 'reschedule';
