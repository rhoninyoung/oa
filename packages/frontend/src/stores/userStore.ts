import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'GROUP_LEADER' | 'PROJECT_MANAGER';
  groupId: string | null;
}

// Seed users for demo
const DEMO_USERS: User[] = [
  { id: 'u1', name: '胡孟瑶', role: 'GROUP_LEADER', groupId: 'g1' },
  { id: 'u2', name: '陈思远', role: 'GROUP_LEADER', groupId: 'g2' },
  { id: 'p1', name: '王架构', role: 'PROJECT_MANAGER', groupId: null },
];

export const useUserStore = create<{
  currentUser: User;
  setUser: (userId: string) => void;
}>((set) => ({
  currentUser: DEMO_USERS[0],
  setUser: (userId) => {
    const u = DEMO_USERS.find((u) => u.id === userId);
    if (u) set({ currentUser: u });
  },
}));
