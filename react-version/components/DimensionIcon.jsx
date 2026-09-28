/**
 * One small icon per real scoring dimension, shared so the same visual
 * language (this exact glyph = this exact dimension) is used everywhere
 * a dimension is shown - the six-dimension gallery/metrics on the
 * homepage, and each X-Ray layer's "relates to" tags - rather than two
 * different icon sets for the same six real categories.
 */
export const DIM_ICONS = {
  pressureRelief: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5.5" opacity="0.5" />
      <circle cx="12" cy="12" r="9" opacity="0.25" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 19h18M6 19V9M12 19V5M18 19v12" strokeLinecap="round" />
    </svg>
  ),
  heat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeLinecap="round" strokeDasharray="4 2" />
      <path d="M2 16c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeLinecap="round" strokeDasharray="4 2" opacity="0.5" />
    </svg>
  ),
  motion: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" strokeLinecap="round" />
    </svg>
  ),
  edge: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" opacity="0.4" />
    </svg>
  ),
  durability: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="15" width="16" height="4" rx="1" />
      <rect x="4" y="9.5" width="16" height="4" rx="1" opacity="0.65" />
      <rect x="4" y="4" width="16" height="4" rx="1" opacity="0.4" />
    </svg>
  ),
};

/**
 * `category` is a full entry from lib/categories.js's CATEGORIES (e.g.
 * { key: 'pressureRelief', icon: 'pressure', ... }) - the SVG is looked
 * up by its real scoring key, and the CSS class by its own `icon` slug,
 * matching the convention the six-dimension gallery/metrics already use
 * (some icons have a matching micro-animation keyed to that slug, e.g.
 * `.dim-pressure circle`, `.dim-heat .flow`, `.dim-motion .wave`).
 */
export default function DimensionIcon({ category, className = '' }) {
  return (
    <span className={`dim-icon dim-${category.icon} ${className}`.trim()}>{DIM_ICONS[category.key]}</span>
  );
}
