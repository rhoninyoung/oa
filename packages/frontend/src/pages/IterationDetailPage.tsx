import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Schedule { id: string; groupId: string; status: string; }

export default function IterationDetailPage() {
  const { iterationId } = useParams<{ iterationId: string }>();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (!iterationId) return;
    axios.get(`/api/iterations/${iterationId}`, { headers: { 'x-user-id': localStorage.getItem('x-user-id') ?? 'u1' } })
      .then(r => setSchedules(r.data))
      .catch(() => setSchedules([]));
  }, [iterationId]);

  return (
    <div className="p-4 w-full">
      <h1 className="text-xl font-bold mb-4">迭代详情 — {iterationId}</h1>
      <p className="text-sm text-gray-500 mb-4">双击组名进入排期表</p>
      <div className="space-y-2">
        {schedules.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
            onDoubleClick={() => navigate(`/iterations/${iterationId}/schedules/${s.groupId}`)}>
            <span className="font-medium">组: {s.groupId}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${s.status === 'APPROVED' ? 'bg-green-100 text-green-700' : s.status === 'REVIEWING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
