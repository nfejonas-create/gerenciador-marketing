import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminModeBanner from './AdminModeBanner';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <AdminModeBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
