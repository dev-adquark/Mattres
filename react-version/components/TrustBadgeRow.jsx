const BADGES = [
  {
    label: 'Real scoring engine',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
        <path d="m8.5 12 2.2 2.2L15.5 9" />
      </svg>
    ),
  },
  {
    label: 'Affiliate links disclosed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 14a4 4 0 0 0 5.66 0l2.34-2.34a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0L6 12.34a4 4 0 0 0 5.66 5.66l1-1" />
      </svg>
    ),
  },
  {
    label: 'No pay-for-rank',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: 'Open methodology',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
];

export default function TrustBadgeRow({ onLight = false }) {
  return (
    <div className="trust-badge-row">
      {BADGES.map((b) => (
        <span className={`trust-badge${onLight ? ' on-light' : ''}`} key={b.label}>
          {b.icon}
          <b>{b.label}</b>
        </span>
      ))}
    </div>
  );
}
