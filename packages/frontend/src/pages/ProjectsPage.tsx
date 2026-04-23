import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  iterations: { id: string; name: string; schedules: { groupId: string; status: string }[] }[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/projects', { headers: { 'x-user-id': localStorage.getItem('x-user-id') ?? 'u1' } })
      .then(r => setProjects(r.data))
      .catch(() => setProjects([]));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">项目列表</h1>
      <ul className="space-y-2">
        {projects.map(p => (
          <li key={p.id}>
            <div className="font-semibold">{p.name}</div>
            <ul className="ml-4 mt-1 space-y-1">
              {p.iterations.map(i => (
                <li key={i.id}>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => navigate(`/iterations/${i.id}`)}
                  >
                    {i.name}
                  </button>
                  <span className="ml-2 text-xs text-gray-400">
                    {i.schedules.map(s => `${s.groupId}:${s.status}`).join(' | ')}
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
