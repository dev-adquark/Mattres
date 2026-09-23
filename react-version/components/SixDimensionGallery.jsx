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
      {CATEGORIES.map((cat) => {
        const value = subScores ? subScores[cat.key] : undefined;
        const hasValue = typeof value === 'number';
        const pct = hasValue ? Math.max(0, Math.min(100, (value / 10) * 100)) : 0;
        return (
          <div className="dv-panel" data-cat={cat.key} key={cat.key}>
            <h4>{cat.label}</h4>
            <p>{CATEGORY_BLURB[cat.key]}</p>
            <div className="dv-score">
              <i>
                <span className="dv-score-fill" style={{ width: `${pct}%` }} />
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
