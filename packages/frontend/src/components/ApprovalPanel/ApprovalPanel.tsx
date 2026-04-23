import { useState } from 'react';
import axios from 'axios';

interface Props {
  schedule: { id: string; status: string; version: number; rejectReason?: string | null };
  onAction: () => void;
}

export default function ApprovalPanel({ schedule, onAction }: Props) {
  const [reason, setReason] = useState('');
  const userId = 'u1';

  const action = async (method: string, body?: Record<string, unknown>) => {
    try {
      await axios.post(`/api/schedules/${schedule.id}/${method}`, body, {
        headers: { 'x-user-id': userId },
      });
      onAction();
    } catch (e: any) {
      alert(e?.response?.data?.code ?? '操作失败');
    }
  };

  if (schedule.status === 'PENDING') {
    return (
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
          onClick={() => action('submit')}>提交</button>
      </div>
    );
  }

  if (schedule.status === 'REVIEWING') {
    return (
      <div className="flex gap-2">
        {userId === 'p1' ? (
          <>
            <button className="bg-green-600 text-white px-4 py-1 rounded text-sm"
              onClick={() => action('approve')}>同意</button>
            <div className="flex gap-1">
              <input className="border rounded px-2 text-sm" placeholder="拒绝理由(10-200字)"
                value={reason} onChange={e => setReason(e.target.value)} maxLength={200} />
              <button className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                disabled={reason.length < 10}
                onClick={() => action('reject', { reason })}>拒绝</button>
            </div>
            <button className="border px-3 py-1 rounded text-sm"
              onClick={() => action('reschedule')}>重新排期</button>
          </>
        ) : (
          <button className="border px-3 py-1 rounded text-sm"
            onClick={() => action('withdraw')}>撤回</button>
        )}
      </div>
    );
  }

  if (schedule.status === 'REJECTED') {
    return (
      <div className="flex gap-2">
        <span className="text-red-600 text-sm">已退回: {schedule.rejectReason ?? '无'}</span>
        <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
          onClick={() => action('submit')}>重新提交</button>
      </div>
    );
  }

  if (schedule.status === 'APPROVED') {
    return <span className="text-green-600 text-sm font-medium">已审批</span>;
  }

  return null;
}
