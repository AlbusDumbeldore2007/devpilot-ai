export default function StatCard({ icon: Icon, label, value, hint, tone = 'violet', progress = null }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__icon">
          <Icon size={18} strokeWidth={1.9} />
        </span>
        {progress !== null && <span className="stat-card__pct">{progress}%</span>}
      </div>
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__label">{label}</p>
      {hint && <p className="stat-card__hint">{hint}</p>}
      {progress !== null && (
        <div className="stat-card__bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </article>
  );
}
