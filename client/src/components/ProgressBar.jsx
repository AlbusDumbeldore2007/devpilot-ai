export default function ProgressBar({ value = 0, tone = 'violet', label, showValue = false, size = 'md' }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className={`progress progress--${size}`}>
      {(label || showValue) && (
        <div className="progress__meta">
          {label && <span>{label}</span>}
          {showValue && <span>{safeValue}%</span>}
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <span className={`progress__fill progress__fill--${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
