export type Role = 'GROUP_LEADER' | 'PROJECT_MANAGER';
export type ScheduleStatus = 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED';
export type TaskSource = 'GROUP' | 'MASTER';
export type TransitionAction = 'submit' | 'withdraw' | 'approve' | 'reject' | 'reschedule';
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
    startDate: string;
    endDate: string;
}
export interface Task {
    id: string;
    scheduleId: string;
    orderIndex: number;
    name: string;
    ownerId: string | null;
    startDate: string | null;
    endDate: string | null;
    durationDays: number | null;
    dependencyTaskId: string | null;
    source: TaskSource;
}
export interface GroupSchedule {
    id: string;
    iterationId: string;
    groupId: string;
    status: ScheduleStatus;
    version: number;
    rejectReason: string | null;
    tasks: Task[];
    createdAt: string;
    updatedAt: string;
}
export interface ApprovalRecord {
    id: string;
    scheduleId: string;
    reviewerId: string;
    action: 'APPROVE' | 'REJECT' | 'RESCHEDULE';
    reason: string | null;
    createdAt: string;
}
export interface NotificationOutbox {
    id: string;
    idempotencyKey: string;
    type: string;
    payload: unknown;
    dispatchedAt: string | null;
    createdAt: string;
}
export type TransitionErrorCode = 'CONTENT_EMPTY' | 'ACTOR_NOT_OWNER' | 'ACTOR_NOT_PM' | 'REASON_INVALID' | 'INVALID_TRANSITION';
export interface TransitionResult {
    ok: true;
    versionBump?: number;
}
export interface TransitionError {
    ok: false;
    code: TransitionErrorCode;
}
export type CycleDetectionResult = {
    hasCycle: false;
} | {
    hasCycle: true;
    type: 'CYCLE_SELF';
    path: [string, string];
} | {
    hasCycle: true;
    type: 'CYCLE';
    path: string[];
};
export type SetDependencyResult = {
    ok: true;
    updatedTasks: Task[];
} | {
    ok: false;
    code: 'ONE_TO_ONE_VIOLATION';
} | {
    ok: false;
    code: 'CYCLE';
    cyclePath?: string[];
};
export type PermissionAction = 'read' | 'edit' | 'submit' | 'withdraw' | 'approve' | 'reject' | 'reschedule' | 'addRow' | 'deleteRow';
export interface PermissionContext {
    type: 'schedule' | 'master' | 'task';
    groupId: string;
    ownGroup: boolean;
    taskSource?: TaskSource;
}
export interface DraftPatch {
    tasks: Task[];
    version: number;
}
export interface DraftSaveResult {
    ok: true;
    newVersion: number;
}
export interface VersionConflict {
    ok: false;
    code: 'VERSION_CONFLICT';
    latestVersion: number;
}
//# sourceMappingURL=types.d.ts.map