import { Outlet } from 'react-router-dom';
import RoleSwitcher from '../RoleSwitcher/RoleSwitcher.jsx';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <span className="font-bold text-lg">OA 平台</span>
        <RoleSwitcher />
      </header>
      <main className="flex flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
