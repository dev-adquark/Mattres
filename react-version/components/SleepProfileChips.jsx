const PROFILES = [
  {
    label: 'Side Sleeper',
    sub: 'Pressure relief',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 18v-4a4 4 0 0 1 4-4h1a3 3 0 0 1 3 3v1M4 18h16v-3M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
    ),
  },
  {
    label: 'Back Sleeper',
    sub: 'Support',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 18v-3a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v3M4 18h16" />
        <circle cx="12" cy="6" r="2" />
      </svg>
    ),
  },
  {
    label: 'Hot Sleeper',
    sub: 'Cooling',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeDasharray="4 2" />
        <path d="M2 16c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeDasharray="4 2" opacity="0.5" />
      </svg>
    ),
  },
  {
    label: 'Couples',
    sub: 'Motion isolation',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M3 20v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4M13 19v-1a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1" />
      </svg>
    ),
  },
];

export default function SleepProfileChips() {
  return (
    <div className="fm-side-card">
      <h5>Popular sleep profiles</h5>
      <p className="sub">A quick sense of what each covers — answer the form for your own real score.</p>
      <div>
        {PROFILES.map((p) => (
          <div className="fm-profile-chip" key={p.label}>
            <span className="ic" aria-hidden="true">
              {p.icon}
            </span>
            <div>
              <b>{p.label}</b>
              <span>{p.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
