import { useState, useCallback, useRef, useEffect } from 'react';
import type { Task } from './types.js';

interface Props {
  tasks: Task[];
  scheduleStatus: string;
  onChange: (tasks: Task[]) => void;
}

export default function WbsTable({ tasks, scheduleStatus, onChange }: Props) {
  const [rows, setRows] = useState<Task[]>(tasks);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const undoRef = useRef<Task[][]>([]);

  useEffect(() => { setRows(tasks); }, [tasks]);

  const pushUndo = useCallback((prev: Task[]) => {
    undoRef.current = undoRef.current.slice(-49).concat([prev]);
  }, []);

  const updateCell = useCallback((r: number, field: keyof Task, value: unknown) => {
    const prev = rows;
    pushUndo(prev);
    const next = prev.map((t, i) => i === r ? { ...t, [field]: value } : t);
    setRows(next);
    onChange(next);
  }, [rows, onChange, pushUndo]);

  const insertRow = useCallback((afterIndex: number) => {
    const prev = rows;
    pushUndo(prev);
    const next = [...prev.slice(0, afterIndex + 1),
      { id: `new-${Date.now()}`, scheduleId: '', orderIndex: afterIndex + 1, name: '', ownerId: null, startDate: null, endDate: null, durationDays: null, dependencyTaskId: null, source: 'GROUP' as const },
      ...prev.slice(afterIndex + 1).map((t, i) => ({ ...t, orderIndex: afterIndex + 2 + i }))];
    setRows(next);
    onChange(next);
  }, [rows, onChange, pushUndo]);

  const deleteRow = useCallback((index: number) => {
    const prev = rows;
    pushUndo(prev);
    const next = prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setRows(next);
    onChange(next);
  }, [rows, onChange, pushUndo]);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev) { setRows(prev); onChange(prev); }
  }, [onChange]);

  const COLS: { key: keyof Task; label: string; width: string }[] = [
    { key: 'orderIndex', label: '#', width: 'w-12' },
    { key: 'name', label: '任务名', width: 'w-64' },
    { key: 'ownerId', label: '负责人', width: 'w-32' },
    { key: 'startDate', label: '开始日期', width: 'w-36' },
    { key: 'endDate', label: '结束日期', width: 'w-36' },
    { key: 'durationDays', label: '持续天数', width: 'w-24' },
    { key: 'dependencyTaskId', label: '依赖', width: 'w-24' },
  ];

  const readonly = scheduleStatus !== 'PENDING' && scheduleStatus !== 'REJECTED';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button className="text-sm border px-3 py-1 rounded" onClick={() => insertRow(rows.length - 1)} disabled={readonly}>+ 插入行</button>
        <button className="text-sm border px-3 py-1 rounded" onClick={undo} disabled={!undoRef.current.length}>撤销</button>
      </div>
      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {COLS.map(c => (
                <th key={c.key} className={`px-3 py-2 text-left font-medium text-gray-600 ${c.width} sticky top-0 bg-gray-50`}>{c.label}</th>
              ))}
              {!readonly && <th className="w-24 sticky top-0 bg-gray-50">操作</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((task, r) => (
              <tr key={task.id} className="border-b hover:bg-gray-50">
                {COLS.map(({ key, width }) => (
                  <td key={key} className={`px-3 py-1 ${width}`}>
                    {key === 'orderIndex'
                      ? <span className="text-gray-400">{task.orderIndex}</span>
                      : <input
                          className={`w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 ${readonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                          value={String(task[key] ?? '')}
                          readOnly={readonly}
                          onChange={e => updateCell(r, key, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.altKey) {
                              e.preventDefault();
                              updateCell(r, key, String(task[key] ?? '').replace(/\n/g, '\n'));
                            }
                          }}
                        />}
                  </td>
                ))}
                {!readonly && (
                  <td className="px-3 py-1">
                    <button className="text-red-500 text-xs hover:underline" onClick={() => deleteRow(r)}>删除</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
