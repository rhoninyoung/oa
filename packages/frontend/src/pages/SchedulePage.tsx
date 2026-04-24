import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import WbsTable from '../components/WbsTable/WbsTable.jsx';
import ApprovalPanel from '../components/ApprovalPanel/ApprovalPanel.jsx';
import { useAutoSave } from '../hooks/useAutoSave.js';
import { useUserStore } from '../stores/userStore.js';
import type { Task } from '../components/WbsTable/types.js';

interface Schedule {
  id: string;
  status: string;
  version: number;
  tasks: Task[];
}

export default function SchedulePage() {
  const { iterationId, groupId } = useParams<{ iterationId: string; groupId: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const { currentUser } = useUserStore();

  useEffect(() => {
    if (!iterationId || !groupId) return;
    axios
      .get(`/api/schedules/sch-${groupId}`, { headers: { 'x-user-id': currentUser.id } })
      .then((r) => setSchedule(r.data))
      .catch(() => {});
  }, [iterationId, groupId, currentUser.id]);

  const { mutate: saveDraft } = useAutoSave<Task[]>({
    onSave: async (tasks, version) => {
      if (!schedule) return;
      const { data } = await axios.patch(
        `/api/schedules/${schedule.id}/draft`,
        { tasks, version },
        { headers: { 'x-user-id': currentUser.id } },
      );
      setSchedule((prev) => (prev ? { ...prev, version: data.newVersion } : prev));
    },
  });

  const reloadSchedule = async () => {
    if (!schedule) return;
    const { data } = await axios.get(`/api/schedules/${schedule.id}`, {
      headers: { 'x-user-id': currentUser.id },
    });
    setSchedule(data);
  };

  if (!schedule) return <div className="p-4">加载中…</div>;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">排期表 — {groupId}</h1>
        <ApprovalPanel schedule={schedule} onAction={reloadSchedule} />
      </div>
      <WbsTable
        tasks={schedule.tasks}
        scheduleStatus={schedule.status}
        onChange={(tasks) => saveDraft(tasks, schedule.version)}
      />
    </div>
  );
}
