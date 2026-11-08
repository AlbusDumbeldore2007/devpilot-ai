import { Link } from 'react-router-dom';
import { Compass, LayoutDashboard, Sparkles } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDebounce.js';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <div className="page notfound">
      <div className="notfound__card card">
        <span className="notfound__code">404</span>
        <span className="notfound__icon"><Compass size={30} /></span>
        <h1>This route doesn&apos;t exist</h1>
        <p>
          The page you requested is not part of the workspace. Head back to the dashboard or let the AI planner
          start something new.
        </p>
        <div className="notfound__actions">
          <Link className="btn btn--primary" to="/">
            <LayoutDashboard size={15} /> Go to dashboard
          </Link>
          <Link className="btn btn--ghost" to="/ai-planner">
            <Sparkles size={15} /> AI planner
          </Link>
        </div>
      </div>
    </div>
  );
}
