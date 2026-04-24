import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useUserStore } from '../../stores/userStore.js';

interface Schedule {
  groupId: string;
  status: string;
}
interface Iteration {
  id: string;
  name: string;
  schedules: Schedule[];
}
interface Project {
  id: string;
  name: string;
  iterations: Iteration[];
}

type FetchState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export default function Sidebar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const { currentUser } = useUserStore();
  const navigate = useNavigate();
  const { iterationId } = useParams();

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
    return (
      <aside className="w-56 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          项目 / 迭代
        </div>
        <div className="p-4 text-xs text-gray-400 text-center">加载中…</div>
      </aside>
    );
  }

  if (fetchState === 'error') {
    return (
      <aside className="w-56 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          项目 / 迭代
        </div>
        <div className="p-3 mx-2 mb-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          <div className="font-semibold">加载失败</div>
          <div>{errorMsg}</div>
        </div>
      </aside>
    );
  }

  if (fetchState === 'empty') {
    return (
      <aside className="w-56 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          项目 / 迭代
        </div>
        <div className="p-3 mx-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500">
          暂无数据，请确认后端已启动
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
      <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        项目 / 迭代
      </div>
      {projects.map((project) => (
        <div key={project.id}>
          <div className="px-3 py-1.5 font-medium text-sm text-gray-800">{project.name}</div>
          {project.iterations.map((iter) => (
            <div key={iter.id}>
              <button
                className={`w-full text-left px-6 py-1.5 text-sm hover:bg-blue-50 transition-colors ${
                  iterationId === iter.id
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600'
                }`}
                onClick={() => navigate(`/iterations/${iter.id}`)}
              >
                {iter.name}
              </button>
              <div className="ml-8 space-y-0.5">
                {iter.schedules.map((s) => (
                  <div key={s.groupId} className="flex items-center gap-1.5 px-2 py-0.5">
                    <span className="text-xs text-gray-500">{s.groupId}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        s.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : s.status === 'REVIEWING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : s.status === 'REJECTED'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}
