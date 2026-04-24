import { Outlet } from 'react-router-dom';
import RoleSwitcher from '../RoleSwitcher/RoleSwitcher.jsx';
import Sidebar from '../Sidebar/Sidebar.jsx';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white flex-shrink-0">
        <span className="font-bold text-lg">OA 平台</span>
        <RoleSwitcher />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
