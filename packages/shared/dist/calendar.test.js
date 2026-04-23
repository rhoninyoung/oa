"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calendar_js_1 = require("./calendar.js");
describe('WorkCalendar', () => {
    // ── DT-CAL-01..05: addWorkDays ────────────────────────────────────────────────
    const cal = new calendar_js_1.WorkCalendar([]);
    // 2026-04-20 = Monday
    it('DT-CAL-01: Monday + 1 workDay = Tuesday', () => {
        expect(cal.addWorkDays('2026-04-20', 1)).toBe('2026-04-21');
    });
    // 2026-04-24 = Friday
    it('DT-CAL-02: Friday + 1 = next Monday', () => {
        expect(cal.addWorkDays('2026-04-24', 1)).toBe('2026-04-27');
    });
    it('DT-CAL-03: Friday + 3 = next Wednesday', () => {
        expect(cal.addWorkDays('2026-04-24', 3)).toBe('2026-04-29');
    });
    // Holiday override: treat Fri 2026-04-24 as holiday
    it('DT-CAL-04: Friday as holiday + 2 workDays = Tuesday', () => {
        const cal2 = new calendar_js_1.WorkCalendar(['2026-04-24']);
        // Thu +2 = Tue (skip Fri holiday + Sat + Sun)
        expect(cal2.addWorkDays('2026-04-23', 2)).toBe('2026-04-28');
    });
    it('DT-CAL-05: duration=0 → same day', () => {
        expect(cal.addWorkDays('2026-04-20', 0)).toBe('2026-04-20');
    });
    // ── isWorkDay ─────────────────────────────────────────────────────────────────
    it('Saturday is not a work day', () => {
        expect(cal.isWorkDay('2026-04-25')).toBe(false);
    });
    it('Sunday is not a work day', () => {
        expect(cal.isWorkDay('2026-04-26')).toBe(false);
    });
    it('Monday is a work day', () => {
        expect(cal.isWorkDay('2026-04-20')).toBe(true);
    });
    it('Configured holiday is not a work day', () => {
        const cal2 = new calendar_js_1.WorkCalendar(['2026-04-21']);
        expect(cal2.isWorkDay('2026-04-21')).toBe(false);
    });
    // ── DT-CAL-06..08: time propagation ──────────────────────────────────────────
    it('DT-CAL-06: downstream start = dep.finish + 1 workDay', () => {
        const cal = new calendar_js_1.WorkCalendar([]);
        // T1 finishes on Friday 2026-04-24
        const downstreamStart = cal.addWorkDays('2026-04-24', 1);
        expect(downstreamStart).toBe('2026-04-27'); // next Monday
    });
    it('DT-CAL-07: chain propagation — B changes, C and D update', () => {
        // This is a higher-level integration test using propagateFinishChange.
        // Test data: A→B→C, A→D (D depends only on A).
        // If B.finish moves earlier, only B's downstream (C) should shift.
        const cal = new calendar_js_1.WorkCalendar([]);
        // Simulate: A finishes on Fri 2026-04-24
        // B (depends on A) starts Mon 2026-04-27
        // C (depends on B) starts Tue 2026-04-28
        // D (depends on A) starts Mon 2026-04-27
        // If B.finish moves to Wed 2026-04-22:
        // B starts Thu 2026-04-23, C starts Fri 2026-04-24
        // D unchanged (Mon 2026-04-27)
        const upstreamFinish = '2026-04-22'; // Wed, moved earlier
        const bStart = cal.addWorkDays(upstreamFinish, 1);
        expect(bStart).toBe('2026-04-23');
        const cStart = cal.addWorkDays(bStart, 1);
        expect(cStart).toBe('2026-04-24');
        // D unaffected
        const dStart = cal.addWorkDays('2026-04-24', 1);
        expect(dStart).toBe('2026-04-27');
    });
    it('DT-CAL-08: upstream finishes earlier → downstream shifts earlier', () => {
        const cal = new calendar_js_1.WorkCalendar([]);
        // Original: A finishes Fri → B starts Mon
        // A moves to Wed → B starts Thu
        expect(cal.addWorkDays('2026-04-22', 1)).toBe('2026-04-23'); // moved earlier
        expect(cal.addWorkDays('2026-04-24', 1)).toBe('2026-04-27'); // original
    });
});
//# sourceMappingURL=calendar.test.js.map