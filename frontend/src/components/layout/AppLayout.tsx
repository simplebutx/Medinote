import { Outlet } from 'react-router-dom';

import NotificationWatcher from '../../features/notification/components/NotificationWatcher';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <NotificationWatcher />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
