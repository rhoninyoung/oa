"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_js_1 = require("./permissions.js");
describe('permissions', () => {
    // ── DT-PERM-01: GL对本组schedule ─────────────────────────────────────────────
    describe('DT-PERM-01: GL对本组schedule', () => {
        const ctx = { type: 'schedule', groupId: 'g1', ownGroup: true };
        it('edit → allow', () => {
            expect((0, permissions_js_1.permissions)('GROUP_LEADER', ctx, 'edit')).toEqual({ allowed: true });
        });
        it('submit → allow', () => {
            expect((0, permissions_js_1.permissions)('GROUP_LEADER', ctx, 'submit')).toEqual({ allowed: true });
        });
        it('withdraw → allow', () => {
            expect((0, permissions_js_1.permissions)('GROUP_LEADER', ctx, 'withdraw')).toEqual({ allowed: true });
        });
        it('approve → deny, ACTOR_NOT_PM', () => {
            expect((0, permissions_js_1.permissions)('GROUP_LEADER', ctx, 'approve')).toMatchObject({
                allowed: false,
                code: 'ACTOR_NOT_PM',
            });
        });
    });
    // ── DT-PERM-02: GL对非本组schedule ───────────────────────────────────────────
    describe('DT-PERM-02: GL对非本组schedule', () => {
        const ctx = { type: 'schedule', groupId: 'g2', ownGroup: false };
        it('read → allow', () => {
            expect((0, permissions_js_1.permissions)('GROUP_LEADER', ctx, 'read')).toEqual({ allowed: true });
        });
        it('edit → deny', () => {
            expect((0, permissions_js_1.permissions)('GROUP_LEADER', ctx, 'edit')).toMatchObject({
                allowed: false,
                code: 'ACTOR_NOT_OWNER',
            });
        });
    });
    // ── DT-PERM-03: PM对任意schedule ─────────────────────────────────────────────
    describe('DT-PERM-03: PM对任意schedule', () => {
        const ctx = { type: 'schedule', groupId: 'g1', ownGroup: false };
        it('read → allow', () => {
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'read')).toEqual({ allowed: true });
        });
        it('approve/reject/reschedule → allow', () => {
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'approve')).toEqual({ allowed: true });
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'reject')).toEqual({ allowed: true });
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'reschedule')).toEqual({ allowed: true });
        });
        it('direct task field edit → deny', () => {
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'edit')).toMatchObject({
                allowed: false,
                code: 'ACTOR_NOT_OWNER',
            });
        });
    });
    // ── DT-PERM-04: PM对master ────────────────────────────────────────────────────
    describe('DT-PERM-04: PM对master', () => {
        it('addRow → allow', () => {
            const ctx = { type: 'master', groupId: 'g1', ownGroup: false };
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'addRow')).toEqual({ allowed: true });
        });
        it('deleteRow, source=MASTER → allow', () => {
            const ctx = { type: 'master', groupId: 'g1', ownGroup: false, taskSource: 'MASTER' };
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'deleteRow')).toEqual({ allowed: true });
        });
        it('deleteRow, source=GROUP → deny', () => {
            const ctx = { type: 'master', groupId: 'g1', ownGroup: false, taskSource: 'GROUP' };
            expect((0, permissions_js_1.permissions)('PROJECT_MANAGER', ctx, 'deleteRow')).toMatchObject({
                allowed: false,
                code: 'SYNC_ROW_READONLY',
            });
        });
    });
});
//# sourceMappingURL=permissions.test.js.map