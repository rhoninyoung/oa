import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore.js';

interface Project {
  id: string;
  name: string;
  iterations: { id: string; name: string; schedules: { groupId: string; status: string }[] }[];
}

type FetchState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const navigate = useNavigate();
  const { currentUser } = useUserStore();

  useEffect(() => {
    setFetchState('loading');
    axios
      .get('/api/projects', { headers: { 'x-user-id': currentUser.id } })
      .then((r) => {
        const data: Project[] = r.data;
        setProjects(data);
        setFetchState(data.length === 0 ? 'empty' : 'success');
      })
      .catch((e) => {
        const status = e?.response?.status;
        const msg = e?.message ?? 'Unknown error';
        setErrorMsg(status ? `[${status}] ${msg}` : msg);
        setFetchState('error');
      });
  }, [currentUser.id]);

  if (fetchState === 'loading') {
    return <div className="p-4 text-gray-500 text-sm">加载中…</div>;
  }

  if (fetchState === 'error') {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <div className="font-semibold mb-1">加载失败</div>
          <div>{errorMsg}</div>
          <div className="mt-2 text-xs text-red-500">
            请检查：后端是否启动（http://localhost:3000）
            <br />
            是否已运行 <code className="bg-red-100 px-1 rounded">pnpm seed</code>
          </div>
        </div>
      </div>
    );
  }

  if (fetchState === 'empty') {
    return (
      <div className="p-4">
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
          <div className="font-semibold mb-1">暂无项目数据</div>
          <div>
            请确认：后端已启动 + 已执行 <code className="bg-gray-100 px-1 rounded">pnpm seed</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">项目列表</h1>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id}>
            <div className="font-semibold">{p.name}</div>
            <ul className="ml-4 mt-1 space-y-1">
              {p.iterations.map((i) => (
                <li key={i.id}>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => navigate(`/iterations/${i.id}`)}
                  >
                    {i.name}
                  </button>
                  <span className="ml-2 text-xs text-gray-400">
                    {i.schedules.map((s) => `${s.groupId}:${s.status}`).join(' | ')}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
