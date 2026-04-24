import { useUserStore } from '../../stores/userStore.js';

const USERS = [
  { id: 'u1', name: '胡孟瑶', role: '组长 (G1)' },
  { id: 'u2', name: '陈思远', role: '组长 (G2)' },
  { id: 'p1', name: '王架构', role: '项目经理' },
];

export default function RoleSwitcher() {
  const { currentUser, setUser } = useUserStore();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">当前用户：</span>
      <select
        className="border rounded px-2 py-1"
        value={currentUser.id}
        onChange={(e) => setUser(e.target.value)}
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}（{u.role}）
          </option>
        ))}
      </select>
    </div>
  );
}
