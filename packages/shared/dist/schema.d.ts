import { z } from 'zod';
export declare const RoleSchema: z.ZodEnum<["GROUP_LEADER", "PROJECT_MANAGER"]>;
export declare const ScheduleStatusSchema: z.ZodEnum<["PENDING", "REVIEWING", "APPROVED", "REJECTED"]>;
export declare const TaskSourceSchema: z.ZodEnum<["GROUP", "MASTER"]>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["GROUP_LEADER", "PROJECT_MANAGER"]>;
    groupId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    role: "GROUP_LEADER" | "PROJECT_MANAGER";
    groupId: string | null;
}, {
    id: string;
    name: string;
    role: "GROUP_LEADER" | "PROJECT_MANAGER";
    groupId: string | null;
}>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    scheduleId: z.ZodString;
    orderIndex: z.ZodNumber;
    name: z.ZodString;
    ownerId: z.ZodNullable<z.ZodString>;
    startDate: z.ZodNullable<z.ZodString>;
    endDate: z.ZodNullable<z.ZodString>;
    durationDays: z.ZodNullable<z.ZodNumber>;
    dependencyTaskId: z.ZodNullable<z.ZodString>;
    source: z.ZodDefault<z.ZodEnum<["GROUP", "MASTER"]>>;
}, "strip", z.ZodTypeAny, {
    dependencyTaskId: string | null;
    id: string;
    name: string;
    scheduleId: string;
    orderIndex: number;
    ownerId: string | null;
    startDate: string | null;
    endDate: string | null;
    durationDays: number | null;
    source: "GROUP" | "MASTER";
}, {
    dependencyTaskId: string | null;
    id: string;
    name: string;
    scheduleId: string;
    orderIndex: number;
    ownerId: string | null;
    startDate: string | null;
    endDate: string | null;
    durationDays: number | null;
    source?: "GROUP" | "MASTER" | undefined;
}>;
export declare const GroupScheduleSchema: z.ZodObject<{
    id: z.ZodString;
    iterationId: z.ZodString;
    groupId: z.ZodString;
    status: z.ZodEnum<["PENDING", "REVIEWING", "APPROVED", "REJECTED"]>;
    version: z.ZodNumber;
    rejectReason: z.ZodNullable<z.ZodString>;
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        scheduleId: z.ZodString;
        orderIndex: z.ZodNumber;
        name: z.ZodString;
        ownerId: z.ZodNullable<z.ZodString>;
        startDate: z.ZodNullable<z.ZodString>;
        endDate: z.ZodNullable<z.ZodString>;
        durationDays: z.ZodNullable<z.ZodNumber>;
        dependencyTaskId: z.ZodNullable<z.ZodString>;
        source: z.ZodDefault<z.ZodEnum<["GROUP", "MASTER"]>>;
    }, "strip", z.ZodTypeAny, {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source: "GROUP" | "MASTER";
    }, {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source?: "GROUP" | "MASTER" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    groupId: string;
    status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED";
    iterationId: string;
    version: number;
    rejectReason: string | null;
    tasks: {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source: "GROUP" | "MASTER";
    }[];
}, {
    id: string;
    groupId: string;
    status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED";
    iterationId: string;
    version: number;
    rejectReason: string | null;
    tasks: {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source?: "GROUP" | "MASTER" | undefined;
    }[];
}>;
export declare const DraftPatchSchema: z.ZodObject<{
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        scheduleId: z.ZodString;
        orderIndex: z.ZodNumber;
        name: z.ZodString;
        ownerId: z.ZodNullable<z.ZodString>;
        startDate: z.ZodNullable<z.ZodString>;
        endDate: z.ZodNullable<z.ZodString>;
        durationDays: z.ZodNullable<z.ZodNumber>;
        dependencyTaskId: z.ZodNullable<z.ZodString>;
        source: z.ZodDefault<z.ZodEnum<["GROUP", "MASTER"]>>;
    }, "strip", z.ZodTypeAny, {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source: "GROUP" | "MASTER";
    }, {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source?: "GROUP" | "MASTER" | undefined;
    }>, "many">;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    tasks: {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source: "GROUP" | "MASTER";
    }[];
}, {
    version: number;
    tasks: {
        dependencyTaskId: string | null;
        id: string;
        name: string;
        scheduleId: string;
        orderIndex: number;
        ownerId: string | null;
        startDate: string | null;
        endDate: string | null;
        durationDays: number | null;
        source?: "GROUP" | "MASTER" | undefined;
    }[];
}>;
export type { DraftPatch } from './types.js';
//# sourceMappingURL=schema.d.ts.map