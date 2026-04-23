/** WorkCalendar: models a standard Mon–Fri calendar with optional holiday overrides. */
export class WorkCalendar {
  constructor(private readonly holidays: string[] = []) {}

  isWorkDay(dateStr: string): boolean {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    if (day === 0 || day === 6) return false; // Sunday / Saturday
    if (this.holidays.includes(dateStr)) return false;
    return true;
  }

  /**
   * Add `days` work days to `startDate` (exclusive — i.e. the end date after N work days).
   * `days = 0` returns the same calendar day if it is a work day, otherwise the next work day.
   */
  addWorkDays(startDate: string, days: number): string {
    if (days < 0) throw new Error('days must be non-negative');
    if (days === 0) return this.isWorkDay(startDate) ? startDate : this.nextWorkDay(startDate);

    let current = new Date(startDate + 'T00:00:00');
    let remaining = days;

    while (remaining > 0) {
      current = new Date(current.getTime() + 86_400_000); // next day
      if (this.isWorkDay(current.toISOString().slice(0, 10))) {
        remaining--;
      }
    }

    return current.toISOString().slice(0, 10);
  }

  private nextWorkDay(dateStr: string): string {
    let current = new Date(dateStr + 'T00:00:00');
    while (!this.isWorkDay(current.toISOString().slice(0, 10))) {
      current = new Date(current.getTime() + 86_400_000);
    }
    return current.toISOString().slice(0, 10);
  }
}
