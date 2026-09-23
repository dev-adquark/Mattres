import { CATEGORIES, CATEGORY_BLURB } from '@/lib/categories';

/**
 * Renders the six real scoring dimensions. `subScores` is either null
 * (nothing scored yet - renders the honest "-" placeholder state, same
 * as the original project's pre-quiz markup) or the real subScores object
 * from a scoreEngine result ({ pressureRelief, support, heat, motion,
 * edge, durability }, each 0-10). Never accepts or invents a fallback
 * number - a missing key just renders as "-" with a 0-width bar.
 */
export default function SixDimensionGallery({ subScores }) {
  return (
    <div className="dv-gallery" id="dvGallery">
      {CATEGORIES.map((cat, i) => {
        const value = subScores ? subScores[cat.key] : undefined;
        const hasValue = typeof value === 'number';
        const pct = hasValue ? Math.max(0, Math.min(100, (value / 10) * 100)) : 0;
        // Real-data glow: shadow strength scales with the actual sub-score
        // (0 when there's no value yet), same convention as the Match
        // Score ring's glow - never a fixed decorative amount.
        const glow = hasValue ? 2 + (value / 10) * 10 : 0;
        return (
          <div className="dv-panel reveal-up" data-cat={cat.key} key={cat.key} style={{ transitionDelay: `${i * 70}ms` }}>
            <h4>{cat.label}</h4>
            <p>{CATEGORY_BLURB[cat.key]}</p>
            <div className="dv-score">
              <i>
                <span
                  className="dv-score-fill"
                  style={{ width: `${pct}%`, boxShadow: glow ? `0 0 ${glow}px rgba(63,212,255,0.65)` : 'none' }}
                />
                <span className="dv-score-mid" title="Midpoint reference (5/10)" />
              </i>
              <b>{hasValue ? value.toFixed(1) : '—'}</b>
            </div>
          </div>
        );
      })}
    </div>
  );
}
