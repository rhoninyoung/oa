/** WorkCalendar: models a standard Mon–Fri calendar with optional holiday overrides. */
export declare class WorkCalendar {
    private readonly holidays;
    constructor(holidays?: string[]);
    isWorkDay(dateStr: string): boolean;
    /**
     * Add `days` work days to `startDate` (exclusive — i.e. the end date after N work days).
     * `days = 0` returns the same calendar day if it is a work day, otherwise the next work day.
     */
    addWorkDays(startDate: string, days: number): string;
    private nextWorkDay;
}
//# sourceMappingURL=calendar.d.ts.map