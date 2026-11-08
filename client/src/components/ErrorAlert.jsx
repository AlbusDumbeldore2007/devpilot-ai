import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorAlert({ title = 'Something went wrong', message, details = [], onRetry, action }) {
  return (
    <div className="error-alert" role="alert">
      <span className="error-alert__icon">
        <AlertTriangle size={18} />
      </span>
      <div className="error-alert__content">
        <p className="error-alert__title">{title}</p>
        {message && <p className="error-alert__message">{message}</p>}
        {details?.length > 0 && (
          <ul className="error-alert__details">
            {details.slice(0, 6).map((detail, index) => (
              <li key={index}>{typeof detail === 'string' ? detail : JSON.stringify(detail)}</li>
            ))}
          </ul>
        )}
        {(onRetry || action) && (
          <div className="error-alert__actions">
            {onRetry && (
              <button className="btn btn--ghost btn--xs" onClick={onRetry}>
                <RefreshCw size={13} /> Try again
              </button>
            )}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
