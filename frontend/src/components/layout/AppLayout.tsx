import { Outlet } from 'react-router-dom';

import NotificationWatcher from '../../features/notification/components/NotificationWatcher';
import Sidebar from './Sidebar';

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      <NotificationWatcher />
      <Sidebar />

      <main className="flex-1 min-w-0 px-6 pt-12 pb-10 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
