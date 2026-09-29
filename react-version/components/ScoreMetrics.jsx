import { CATEGORIES } from '@/lib/categories';
import SpotlightCard from './SpotlightCard';

// Ported exactly from the original project's radar chart computation
// (index.html, the radarPolygon block): same axis order, same angles,
// same center/radius, so a given set of real subScores produces the
// identical polygon shape, not a re-derived approximation.
const RADAR_AXIS_ORDER = ['pressureRelief', 'support', 'heat', 'motion', 'edge', 'durability'];
const RADAR_ANGLES = [-90, -30, 30, 90, 150, 210];
const RADAR_CX = 110;
const RADAR_CY = 110;
const RADAR_MAX_R = 90;

function radarPoints(subScores) {
  if (!subScores) return `${RADAR_CX},${RADAR_CY} `.repeat(6).trim();
  return RADAR_AXIS_ORDER.map((cat, i) => {
    const val = subScores[cat] || 0;
    const r = (val / 10) * RADAR_MAX_R;
    const rad = (RADAR_ANGLES[i] * Math.PI) / 180;
    return `${(RADAR_CX + r * Math.cos(rad)).toFixed(1)},${(RADAR_CY + r * Math.sin(rad)).toFixed(1)}`;
  }).join(' ');
}

const DIM_ICONS = {
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
 * `subScores` is null pre-quiz (renders the honest "-" / 0%-width bars,
 * same as the original's pre-quiz markup) or the real subScores object.
 * The X-Ray jump-on-click interaction (data-cat -> matching X-Ray layer)
 * is deferred until the X-Ray section itself exists in this port - the
 * sm-hint text is shown but not yet wired to a real handler.
 */
export default function ScoreMetrics({ subScores, onDimensionClick }) {
  return (
    <div className="score-metrics">
      <div className="score-connector" aria-hidden="true">
        <span className="conn-pulse" />
      </div>
      {CATEGORIES.map((cat) => {
        const value = subScores ? subScores[cat.key] : undefined;
        const hasValue = typeof value === 'number';
        const pct = hasValue ? Math.max(0, Math.min(100, (value / 10) * 100)) : 0;
        const jump = () => onDimensionClick?.(cat.key);
        return (
          <SpotlightCard
            as="div"
            className="sm-row"
            data-cat={cat.key}
            key={cat.key}
            tabIndex={0}
            role="button"
            aria-label={`See the related X-Ray layer for ${cat.label}`}
            onClick={jump}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                jump();
              }
            }}
          >
            <span className={`dim-icon dim-${cat.icon}`}>{DIM_ICONS[cat.key]}</span>
            <span className="sm-label">{cat.label}</span>
            <div className="sm-bar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <b>{hasValue ? value.toFixed(1) : '—'}</b>
            <span className="sm-hint">View in X-Ray →</span>
          </SpotlightCard>
        );
      })}

      <div className="radar-wrap">
        <svg className="radar-svg" viewBox="-40 -10 300 240" aria-hidden="true">
          <polygon className="radar-grid" points="110,80 136,95 136,125 110,140 84,125 84,95" />
          <polygon className="radar-grid" points="110,50 162,80 162,140 110,170 58,140 58,80" />
          <polygon className="radar-grid" points="110,20 187.9,65 187.9,155 110,200 32.1,155 32.1,65" />
          <line className="radar-axis" x1="110" y1="110" x2="110" y2="20" />
          <line className="radar-axis" x1="110" y1="110" x2="187.9" y2="65" />
          <line className="radar-axis" x1="110" y1="110" x2="187.9" y2="155" />
          <line className="radar-axis" x1="110" y1="110" x2="110" y2="200" />
          <line className="radar-axis" x1="110" y1="110" x2="32.1" y2="155" />
          <line className="radar-axis" x1="110" y1="110" x2="32.1" y2="65" />
          <polygon
            className="radar-fill"
            points={radarPoints(subScores)}
            style={{ transition: 'points 1s cubic-bezier(.16,1,.3,1)' }}
          />
          <text className="radar-label" x="110" y="12" textAnchor="middle">Pressure</text>
          <text className="radar-label" x="196" y="62" textAnchor="start">Support</text>
          <text className="radar-label" x="196" y="160" textAnchor="start">Cooling</text>
          <text className="radar-label" x="110" y="214" textAnchor="middle">Motion</text>
          <text className="radar-label" x="24" y="160" textAnchor="end">Edge</text>
          <text className="radar-label" x="24" y="62" textAnchor="end">Durability</text>
        </svg>
        <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Six-dimension profile</span>
      </div>
    </div>
  );
}
