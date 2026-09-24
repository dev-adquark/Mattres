const STEPS = [
  {
    title: 'Answer your sleep profile',
    desc: 'Position, weight range, firmness preference, temperature, and motion sensitivity.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
  {
    title: 'We score the whole catalog',
    desc: 'Every mattress is scored live against your exact profile — six real dimensions, every time.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
        <path d="m8.5 12 2.2 2.2L15.5 9" />
      </svg>
    ),
  },
  {
    title: 'See the real breakdown',
    desc: 'Sub-scores, risk flags, and an X-Ray view of exactly why each mattress scored the way it did.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    title: 'Compare and decide',
    desc: 'Shortlist up to four, compare them side by side, then go straight to the retailer when ready.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="10" rx="1.5" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <div className="hiw-grid">
      {STEPS.map((s, i) => (
        <div className="hiw-step" key={s.title}>
          <span className="hiw-step-num" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="hiw-icon" aria-hidden="true">
            {s.icon}
          </span>
          <h5>{s.title}</h5>
          <p>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}
