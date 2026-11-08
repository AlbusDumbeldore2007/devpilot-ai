import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Plus, Wifi, WifiOff } from 'lucide-react';

const PAGE_LABELS = {
  '/': { section: 'Workspace', page: 'Dashboard' },
  '/projects': { section: 'Workspace', page: 'Projects' },
  '/tasks': { section: 'Workspace', page: 'Task Manager' },
  '/ai-planner': { section: 'AI Copilot', page: 'AI Project Planner' },
  '/assistant': { section: 'AI Copilot', page: 'AI Assistant' },
  '/lab': { section: 'Academy', page: 'JavaScript Lab' },
};

function getPageLabel(pathname) {
  // Normalize a trailing slash so direct links like /tasks/ still resolve a title.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path.startsWith('/projects/')) return { section: 'Workspace', page: 'Project Details' };
  return PAGE_LABELS[path] || { section: 'Workspace', page: 'Not Found' };
}

export default function Navbar({ onMenuClick, health, healthError }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { section, page } = getPageLabel(pathname);

  const online = Boolean(health) && !healthError;
  const degraded = online && (!health.database?.connected || !health.ai?.configured);

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button className="icon-btn navbar__menu" onClick={onMenuClick} aria-label="Open navigation">
          <Menu size={19} />
        </button>
        <div className="navbar__crumbs">
          <span className="navbar__section">{section}</span>
          <span className="navbar__sep">/</span>
          <span className="navbar__page">{page}</span>
        </div>
      </div>

      <div className="navbar__actions">
        <div
          className={`health-pill ${!online ? 'health-pill--danger' : degraded ? 'health-pill--warning' : 'health-pill--ok'}`}
          title={
            online
              ? degraded
                ? 'API is online but a service needs configuration'
                : 'API and database connected'
              : healthError || 'Cannot reach the API'
          }
        >
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{online ? (degraded ? 'Degraded' : 'API online') : 'API offline'}</span>
        </div>

        <div className="navbar__divider" />

        <button className="btn btn--primary btn--sm navbar__cta" onClick={() => navigate('/tasks?new=1')}>
          <Plus size={15} />
          <span>New task</span>
        </button>

        <div className="avatar" title="Local developer workspace">
          <span>DV</span>
          <i className={`avatar__status ${online ? 'is-online' : ''}`} />
        </div>
      </div>
    </header>
  );
}
