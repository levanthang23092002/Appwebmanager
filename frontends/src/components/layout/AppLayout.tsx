import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from '../../hooks/useSidebar';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const { open, openSidebar, closeSidebar, setOpen } = useSidebar();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('toggleBtn');
      if (
        window.innerWidth <= 992 &&
        sidebar &&
        toggle &&
        !sidebar.contains(e.target as Node) &&
        !toggle.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [setOpen]);

  return (
    <div className="app-container">
      <div
        className={`sidebar-overlay${open ? ' active' : ''}`}
        onClick={closeSidebar}
        onKeyDown={(e) => e.key === 'Escape' && closeSidebar()}
        role="presentation"
      />
      <Sidebar open={open} onClose={closeSidebar} />
      <main className="main-content">
        <Topbar onMenuClick={openSidebar} />
        <Outlet />
      </main>
    </div>
  );
}
