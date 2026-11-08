import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Sparkles,
  MessagesSquare,
  FlaskConical,
  X,
} from 'lucide-react';
import Logo from './Logo.jsx';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/tasks', label: 'Task Manager', icon: ListTodo },
    ],
  },
  {
    label: 'AI Copilot',
    items: [
      { to: '/ai-planner', label: 'AI Project Planner', icon: Sparkles, badge: 'AI' },
      { to: '/assistant', label: 'AI Assistant', icon: MessagesSquare },
    ],
  },
  {
    label: 'Academy',
    items: [{ to: '/lab', label: 'JavaScript Lab', icon: FlaskConical }],
  },
];

function statusFromHealth(health, error) {
  if (error) return { tone: 'danger', label: 'API offline' };
  if (!health) return { tone: 'neutral', label: 'Checking API…' };
  if (!health.database?.connected) return { tone: 'danger', label: 'Database offline' };
  if (!health.ai?.configured) return { tone: 'warning', label: 'AI key missing' };
  return { tone: 'success', label: 'All systems operational' };
}

export default function Sidebar({ open, onClose, health, healthError }) {
  const status = statusFromHealth(health, healthError);

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar__brand">
          <NavLink to="/" className="sidebar__brand-link" onClick={onClose}>
            <Logo />
          </NavLink>
          <button className="sidebar__close" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <div className="sidebar__section" key={section.label}>
              <p className="sidebar__section-title">{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={1.8} className="nav-item__icon" />
                    <span>{item.label}</span>
                    {item.badge && <span className="nav-item__badge">{item.badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar-status">
            <span className={`status-dot status-dot--${status.tone}`} />
            <div className="sidebar-status__text">
              <p>{status.label}</p>
              <span>{health?.ai?.model ? `Model · ${health.ai.model}` : 'DevPilot AI v1.0'}</span>
            </div>
          </div>
          <p className="sidebar__version">React · Express · MongoDB</p>
        </div>
      </aside>
    </>
  );
}
