import type { ScheduleStatus, Role, TransitionResult, TransitionError } from './types.js';
interface TransitionCtx {
    tasksNonEmpty?: boolean;
    rejectReason?: string;
}
/** Pure function: can the given actor transition schedule from `from` to `to`? */
export declare function canTransition(from: ScheduleStatus, to: ScheduleStatus, actor: Role, ctx: TransitionCtx): TransitionResult | TransitionError;
export {};
//# sourceMappingURL=stateMachine.d.ts.map