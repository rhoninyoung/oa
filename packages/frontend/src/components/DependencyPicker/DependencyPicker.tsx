import { useState } from 'react';
import axios from 'axios';
import type { Task } from '../WbsTable/types.js';

interface Props {
  task: Task;
  allTasks: Task[];
  onUpdated: (task: Task) => void;
  userId: string;
}

export default function DependencyPicker({ task, allTasks, onUpdated, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const candidates = allTasks.filter((t) => t.id !== task.id);

  const select = async (depId: string | null) => {
    setOpen(false);
    setError('');
    try {
      await axios.put(
        `/api/tasks/${task.id}/dependency`,
        { dependencyTaskId: depId },
        { headers: { 'x-user-id': userId } },
      );
      onUpdated({ ...task, dependencyTaskId: depId });
    } catch (e: any) {
      const msg = e?.response?.data?.code ?? '设置依赖失败';
      setError(msg === 'CYCLE' ? '循环依赖！' : msg);
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        className={`text-xs border px-2 py-0.5 rounded hover:bg-blue-50 ${task.dependencyTaskId ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
        onClick={() => setOpen((o) => !o)}
        title="设置依赖"
      >
        {task.dependencyTaskId
          ? allTasks.find((t) => t.id === task.dependencyTaskId)?.name || task.dependencyTaskId
          : '+ 依赖'}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded shadow-lg w-48 max-h-48 overflow-y-auto text-xs">
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-400"
            onClick={() => select(null)}
          >
            无依赖
          </button>
          {candidates.map((t) => (
            <button
              key={t.id}
              className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 ${t.id === task.dependencyTaskId ? 'bg-blue-50 text-blue-700' : ''}`}
              onClick={() => select(t.id)}
            >
              {t.name || <span className="italic text-gray-400">（未命名）</span>}
            </button>
          ))}
        </div>
      )}
      {error && <div className="text-red-500 text-xs mt-0.5">{error}</div>}
    </div>
  );
}
