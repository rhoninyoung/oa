"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = canTransition;
/** Pure function: can the given actor transition schedule from `from` to `to`? */
function canTransition(from, to, actor, ctx) {
    switch (from) {
        case 'PENDING':
            if (to === 'REVIEWING') {
                if (actor !== 'GROUP_LEADER')
                    return { ok: false, code: 'ACTOR_NOT_OWNER' };
                if (!ctx.tasksNonEmpty)
                    return { ok: false, code: 'CONTENT_EMPTY' };
                return { ok: true };
            }
            break;
        case 'REJECTED':
            if (to === 'REVIEWING') {
                if (actor !== 'GROUP_LEADER')
                    return { ok: false, code: 'ACTOR_NOT_OWNER' };
                if (!ctx.tasksNonEmpty)
                    return { ok: false, code: 'CONTENT_EMPTY' };
                return { ok: true };
            }
            break;
        case 'APPROVED':
            if (to === 'REVIEWING') {
                if (actor !== 'GROUP_LEADER')
                    return { ok: false, code: 'ACTOR_NOT_OWNER' };
                if (!ctx.tasksNonEmpty)
                    return { ok: false, code: 'CONTENT_EMPTY' };
                return { ok: true };
            }
            if (to === 'REJECTED' && actor === 'PROJECT_MANAGER') {
                return { ok: true }; // PM reschedule
            }
            break;
        case 'REVIEWING':
            if (to === 'PENDING') {
                if (actor !== 'GROUP_LEADER')
                    return { ok: false, code: 'ACTOR_NOT_OWNER' };
                return { ok: true };
            }
            if (to === 'APPROVED') {
                if (actor !== 'PROJECT_MANAGER')
                    return { ok: false, code: 'ACTOR_NOT_PM' };
                return { ok: true };
            }
            if (to === 'REJECTED') {
                if (actor !== 'PROJECT_MANAGER')
                    return { ok: false, code: 'ACTOR_NOT_PM' };
                const reason = ctx.rejectReason ?? '';
                if (reason.length === 0 || reason.length > 200) {
                    return { ok: false, code: 'REASON_INVALID' };
                }
                return { ok: true };
            }
            break;
    }
    return { ok: false, code: 'INVALID_TRANSITION' };
}
//# sourceMappingURL=stateMachine.js.map