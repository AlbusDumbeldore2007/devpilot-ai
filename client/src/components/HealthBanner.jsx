import { useState } from 'react';
import { Database, Sparkles, RefreshCw, WifiOff, X } from 'lucide-react';

/**
 * Surfaces configuration problems as actionable banners instead of letting the
 * app fail silently. Each issue can be dismissed for the current page view.
 */
export default function HealthBanner({ health, error, loading, onRetry }) {
  const [dismissed, setDismissed] = useState({});

  if (loading) return null;

  const banners = [];

  if (error) {
    banners.push({
      id: 'api',
      tone: 'danger',
      icon: WifiOff,
      title: 'API server unreachable',
      message: 'Start the backend with "npm run dev" in the server folder (or npm run dev at the repository root).',
      retry: true,
    });
  } else if (health) {
    if (!health.database?.connected) {
      banners.push({
        id: 'database',
        tone: 'warning',
        icon: Database,
        title: 'MongoDB is not connected',
        message:
          'Set MONGODB_URI in server/.env, start MongoDB, then restart the API. The app will reconnect automatically.',
        retry: true,
      });
    }
    if (!health.ai?.configured) {
      banners.push({
        id: 'ai',
        tone: 'accent',
        icon: Sparkles,
        title: 'AI features need an API key',
        message:
          'Add AI_API_KEY (and optionally AI_BASE_URL / AI_MODEL) to server/.env, then restart the backend.',
      });
    }
  }

  const visible = banners.filter((banner) => !dismissed[banner.id]);
  if (visible.length === 0) return null;

  return (
    <div className="health-banners">
      {visible.map(({ id, tone, icon: Icon, title, message, retry }) => (
        <div className={`health-banner health-banner--${tone}`} key={id}>
          <span className="health-banner__icon">
            <Icon size={17} />
          </span>
          <div className="health-banner__content">
            <p>{title}</p>
            <span>{message}</span>
          </div>
          {retry && (
            <button className="btn btn--ghost btn--xs" onClick={onRetry}>
              <RefreshCw size={13} /> Retry
            </button>
          )}
          <button
            className="health-banner__close"
            onClick={() => setDismissed((current) => ({ ...current, [id]: true }))}
            aria-label="Dismiss banner"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
