"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = permissions;
/** Pure function: does the given role have permission to perform action in context? */
function permissions(role, ctx, action) {
    // ── Group Leader ─────────────────────────────────────────────────────────────
    if (role === 'GROUP_LEADER') {
        // 本组 schedule
        if (ctx.type === 'schedule' && ctx.ownGroup) {
            if (action === 'read' || action === 'edit' || action === 'submit' || action === 'withdraw') {
                return { allowed: true };
            }
            if (action === 'approve' || action === 'reject' || action === 'reschedule' || action === 'addRow' || action === 'deleteRow') {
                return { allowed: false, code: 'ACTOR_NOT_PM' };
            }
        }
        // 非本组 schedule
        if (ctx.type === 'schedule' && !ctx.ownGroup) {
            if (action === 'read')
                return { allowed: true };
            return { allowed: false, code: 'ACTOR_NOT_OWNER' };
        }
        // master: GL cannot add/delete rows
        if (ctx.type === 'master') {
            return { allowed: false, code: 'ACTOR_NOT_PM' };
        }
        return { allowed: false, code: 'ACTOR_NOT_OWNER' };
    }
    // ── Project Manager ─────────────────────────────────────────────────────────
    if (role === 'PROJECT_MANAGER') {
        if (ctx.type === 'schedule') {
            if (action === 'read' || action === 'approve' || action === 'reject' || action === 'reschedule') {
                return { allowed: true };
            }
            // PM cannot directly edit tasks (only via master)
            if (action === 'edit' || action === 'submit' || action === 'withdraw' || action === 'addRow') {
                return { allowed: false, code: 'ACTOR_NOT_OWNER' };
            }
            if (action === 'deleteRow') {
                return { allowed: false, code: 'ACTOR_NOT_OWNER' };
            }
        }
        if (ctx.type === 'master') {
            if (action === 'read' || action === 'addRow')
                return { allowed: true };
            if (action === 'deleteRow') {
                return ctx.taskSource === 'MASTER'
                    ? { allowed: true }
                    : { allowed: false, code: 'SYNC_ROW_READONLY' };
            }
            // PM cannot edit master rows directly either
            if (action === 'edit')
                return { allowed: false, code: 'ACTOR_NOT_OWNER' };
        }
    }
    return { allowed: false, code: 'ACTOR_NOT_OWNER' };
}
//# sourceMappingURL=permissions.js.map