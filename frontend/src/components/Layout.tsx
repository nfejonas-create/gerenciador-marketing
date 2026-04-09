import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full min-w-0">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
