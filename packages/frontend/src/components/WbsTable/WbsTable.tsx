import { useState, useCallback, useRef, useEffect } from 'react';
import type { Task } from './types.js';
import DependencyPicker from '../DependencyPicker/DependencyPicker.jsx';
import { useUserStore } from '../../stores/userStore.js';

interface Props {
  tasks: Task[];
  scheduleStatus: string;
  onChange: (tasks: Task[]) => void;
}

const COLS: { key: keyof Task; label: string; width: string; editable?: boolean }[] = [
  { key: 'orderIndex', label: '#', width: 'w-12', editable: false },
  { key: 'name', label: '任务名', width: 'w-64', editable: true },
  { key: 'ownerId', label: '负责人', width: 'w-32', editable: true },
  { key: 'startDate', label: '开始日期', width: 'w-36', editable: true },
  { key: 'endDate', label: '结束日期', width: 'w-36', editable: true },
  { key: 'durationDays', label: '持续天数', width: 'w-24', editable: true },
  { key: 'dependencyTaskId', label: '依赖', width: 'w-28', editable: false },
];

export default function WbsTable({ tasks, scheduleStatus, onChange }: Props) {
  const [rows, setRows] = useState<Task[]>(tasks);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [clipboard, setClipboard] = useState<string>('');
  const undoRef = useRef<Task[][]>([]);
  const inputRef = useRef<Record<string, HTMLInputElement | null>>({});
  const { currentUser } = useUserStore();

  useEffect(() => {
    setRows(tasks);
  }, [tasks]);

  const editableIndices = COLS.filter((c) => c.editable).map((c, i) => ({ col: c, index: i }));

  const cellRefKey = (r: number, c: number) => `${r}-${c}`;

  const focusInput = useCallback((r: number, c: number) => {
    const el = inputRef.current[cellRefKey(r, c)];
    if (el) el.focus();
    setSelected({ r, c });
  }, []);

  const pushUndo = useCallback((prev: Task[]) => {
    undoRef.current = undoRef.current.slice(-49).concat([prev]);
  }, []);

  const updateCell = useCallback(
    (r: number, field: keyof Task, value: unknown) => {
      const prev = rows;
      pushUndo(prev);
      const next = prev.map((t, i) => (i === r ? { ...t, [field]: value } : t));
      setRows(next);
      onChange(next);
    },
    [rows, onChange, pushUndo],
  );

  const handleTaskUpdated = useCallback(
    (index: number, updated: Task) => {
      const prev = rows;
      pushUndo(prev);
      const next = prev.map((t, i) => (i === index ? updated : t));
      setRows(next);
      onChange(next);
    },
    [rows, onChange, pushUndo],
  );

  const insertRow = useCallback(
    (afterIndex: number) => {
      const prev = rows;
      pushUndo(prev);
      const next = [
        ...prev.slice(0, afterIndex + 1),
        {
          id: `new-${Date.now()}`,
          scheduleId: '',
          orderIndex: afterIndex + 1,
          name: '',
          ownerId: null,
          startDate: null,
          endDate: null,
          durationDays: null,
          dependencyTaskId: null,
          source: 'GROUP' as const,
        },
        ...prev.slice(afterIndex + 1).map((t, i) => ({ ...t, orderIndex: afterIndex + 2 + i })),
      ];
      setRows(next);
      onChange(next);
    },
    [rows, onChange, pushUndo],
  );

  const deleteRow = useCallback(
    (index: number) => {
      const prev = rows;
      pushUndo(prev);
      const next = prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, orderIndex: i + 1 }));
      setRows(next);
      onChange(next);
    },
    [rows, onChange, pushUndo],
  );

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev) {
      setRows(prev);
      onChange(prev);
    }
  }, [onChange]);

  const readonly = scheduleStatus !== 'PENDING' && scheduleStatus !== 'REJECTED';

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, r: number, c: number) => {
      if (readonly) return;
      const maxRow = rows.length - 1;
      const maxCol = editableIndices.length - 1;

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const col = editableIndices[c];
        if (col) setClipboard(String(rows[r][col.col.key] ?? ''));
        return;
      }
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const col = editableIndices[c];
        if (col && clipboard) updateCell(r, col.col.key, clipboard);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusInput(r, Math.min(c + 1, maxCol));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusInput(r, Math.max(c - 1, 0));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusInput(Math.min(r + 1, maxRow), c);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusInput(Math.max(r - 1, 0), c);
      }
    },
    [readonly, rows, clipboard, updateCell, focusInput, editableIndices.length],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <button
          className="text-sm border px-3 py-1 rounded"
          onClick={() => insertRow(rows.length - 1)}
          disabled={readonly}
        >
          + 插入行
        </button>
        <button
          className="text-sm border px-3 py-1 rounded"
          onClick={undo}
          disabled={!undoRef.current.length}
        >
          撤销
        </button>
        {clipboard && <span className="text-xs text-gray-400">已复制到剪贴板</span>}
      </div>
      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 text-left font-medium text-gray-600 ${c.width} sticky top-0 bg-gray-50`}
                >
                  {c.label}
                </th>
              ))}
              {!readonly && <th className="w-20 sticky top-0 bg-gray-50">操作</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((task, r) => (
              <tr
                key={task.id}
                className={`border-b hover:bg-gray-50 ${selected?.r === r ? 'bg-blue-50' : ''}`}
              >
                {COLS.map(({ key, width, editable: _editable }) => {
                  const editIdx = editableIndices.findIndex((e) => e.col.key === key);
                  const isSelected = selected?.r === r && selected?.c === editIdx;
                  return (
                    <td key={key} className={`px-3 py-1 ${width}`}>
                      {key === 'orderIndex' ? (
                        <span className="text-gray-400">{task.orderIndex}</span>
                      ) : key === 'dependencyTaskId' ? (
                        <DependencyPicker
                          task={task}
                          allTasks={rows}
                          userId={currentUser.id}
                          onUpdated={(updated) => handleTaskUpdated(r, updated)}
                        />
                      ) : (
                        <input
                          ref={(el) => {
                            inputRef.current[cellRefKey(r, editIdx)] = el;
                          }}
                          className={`w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 ${readonly ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? 'ring-1 ring-blue-400 bg-white' : ''}`}
                          value={String(task[key] ?? '')}
                          readOnly={readonly}
                          onChange={(e) => updateCell(r, key, e.target.value)}
                          onFocus={() => setSelected({ r, c: editIdx })}
                          onKeyDown={(e) => handleKeyDown(e, r, editIdx)}
                        />
                      )}
                    </td>
                  );
                })}
                {!readonly && (
                  <td className="px-3 py-1">
                    <button
                      className="text-red-500 text-xs hover:underline"
                      onClick={() => deleteRow(r)}
                    >
                      删除
                    </button>
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
