export default function Logo({ showText = true }) {
  return (
    <div className="logo">
      <span className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C3B5FF" />
              <stop offset="1" stopColor="#7FB0FF" />
            </linearGradient>
          </defs>
          <path d="M6 24 16 5l10 19-10-5.2L6 24Z" fill="url(#logo-gradient)" />
          <circle cx="16" cy="5" r="2.2" fill="#E9EEFF" />
        </svg>
      </span>
      {showText && (
        <span className="logo__text">
          DevPilot <span className="logo__ai">AI</span>
        </span>
      )}
    </div>
  );
}
