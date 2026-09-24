import Link from 'next/link';

const CATEGORIES = [
  {
    label: 'Memory Foam',
    href: '/find-match',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="12" width="20" height="8" rx="2" />
        <path d="M2 12c1-3 3-4 5-2s3 2 5 0 3-2 5 0 3 1 5-2" />
      </svg>
    ),
  },
  {
    label: 'Hybrid',
    href: '/find-match',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="14" width="20" height="6" rx="1.5" />
        <path d="M4 14v-3a2 2 0 0 1 2-2h1M9 14v-3a2 2 0 0 1 2-2h1M14 14v-3a2 2 0 0 1 2-2h1M19 14v-3a2 2 0 0 1-2-2h-1" />
      </svg>
    ),
  },
  {
    label: 'Innerspring',
    href: '/find-match',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 4v16M6 4a2 2 0 1 1 0 4M6 12a2 2 0 1 1 0 4M18 4v16M18 4a2 2 0 1 0 0 4M18 12a2 2 0 1 0 0 4" />
      </svg>
    ),
  },
  {
    label: 'Latex',
    href: '/find-match',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="10" width="20" height="10" rx="2" />
        <circle cx="7" cy="15" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Adjustable',
    href: '/find-match',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 18h9l3-7h8" />
        <path d="M11 18v3M2 18v-4" />
      </svg>
    ),
  },
];

export default function CategoryIconGrid({ onLight = false }) {
  return (
    <div className="cat-icon-grid">
      {CATEGORIES.map((cat) => (
        <Link href={cat.href} className={`cat-icon-card${onLight ? ' on-light' : ''}`} key={cat.label}>
          <span className="cat-icon-wrap" aria-hidden="true">
            {cat.icon}
          </span>
          <span>{cat.label}</span>
        </Link>
      ))}
    </div>
  );
}
