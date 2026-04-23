import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface Task { id: string; name: string; ownerId: string | null; source: string; orderIndex: number; }

export default function MasterPage() {
  const { iterationId } = useParams<{ iterationId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!iterationId) return;
    axios.get(`/api/master/${iterationId}`, { headers: { 'x-user-id': 'p1' } })
      .then(r => setTasks(r.data))
      .catch(() => {});
  }, [iterationId]);

  const addRow = async () => {
    const ownerId = prompt('输入负责人 ID (u1/u2):');
    if (!ownerId || !iterationId) return;
    await axios.post(`/api/master/${iterationId}/rows`, { ownerId }, { headers: { 'x-user-id': 'p1' } });
    // refresh
    const r = await axios.get(`/api/master/${iterationId}`, { headers: { 'x-user-id': 'p1' } });
    setTasks(r.data);
  };

  const deleteRow = async (taskId: string, source: string) => {
    if (source === 'GROUP') { alert('系统同步行不可删除'); return; }
    await axios.delete(`/api/master/rows/${taskId}`, { headers: { 'x-user-id': 'p1' } });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <div className="p-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">项目总表 — {iterationId}</h1>
        <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm" onClick={addRow}>+ 新增行</button>
      </div>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">任务名</th>
            <th className="px-3 py-2 text-left">负责人</th>
            <th className="px-3 py-2 text-left">来源</th>
            <th className="px-3 py-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-1">{t.orderIndex}</td>
              <td className="px-3 py-1">{t.name || <span className="text-gray-400 italic">（未命名）</span>}</td>
              <td className="px-3 py-1">{t.ownerId ?? '—'}</td>
              <td className="px-3 py-1">
                <span className={`text-xs px-2 py-0.5 rounded ${t.source === 'MASTER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {t.source === 'MASTER' ? 'PM新增' : '组'}
                </span>
              </td>
              <td className="px-3 py-1">
                <button className="text-red-500 text-xs hover:underline" onClick={() => deleteRow(t.id, t.source)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
