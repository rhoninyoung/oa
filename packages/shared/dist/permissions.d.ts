import type { Role, PermissionAction, PermissionContext } from './types.js';
type PermissionResult = {
    allowed: true;
} | {
    allowed: false;
    code: string;
};
/** Pure function: does the given role have permission to perform action in context? */
export declare function permissions(role: Role, ctx: PermissionContext, action: PermissionAction): PermissionResult;
export {};
//# sourceMappingURL=permissions.d.ts.map