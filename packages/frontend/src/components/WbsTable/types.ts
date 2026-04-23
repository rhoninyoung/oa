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
  source: 'GROUP' | 'MASTER';
}
