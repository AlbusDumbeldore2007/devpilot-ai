import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';
import HealthBanner from '../components/HealthBanner.jsx';
import { useSystemHealth } from '../hooks/useSystemHealth.js';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { health, loading, error, refresh } = useSystemHealth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', sidebarOpen);
    return () => document.body.classList.remove('nav-open');
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} health={health} healthError={error} />
      <div className="app-main">
        <Navbar onMenuClick={() => setSidebarOpen(true)} health={health} healthError={error} />
        <main className="app-content">
          <HealthBanner health={health} error={error} loading={loading} onRetry={refresh} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
