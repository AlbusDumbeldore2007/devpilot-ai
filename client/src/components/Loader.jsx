export function Spinner({ size = 20, label = 'Loading' }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label={label} />;
}

export function PageLoader({ label = 'Loading workspace…' }) {
  return (
    <div className="page-loader">
      <Spinner size={26} />
      <p>{label}</p>
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function SkeletonStatGrid({ count = 6 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="stat-card stat-card--skeleton" key={index}>
          <Skeleton width={36} height={36} radius={10} />
          <Skeleton width="55%" height={26} style={{ marginTop: 18 }} />
          <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="projects-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="project-card project-card--skeleton" key={index}>
          <Skeleton width="65%" height={20} />
          <Skeleton width="100%" height={12} style={{ marginTop: 16 }} />
          <Skeleton width="85%" height={12} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={8} style={{ marginTop: 28 }} />
          <Skeleton width="45%" height={12} style={{ marginTop: 18 }} />
        </div>
      ))}
    </div>
  );
}
