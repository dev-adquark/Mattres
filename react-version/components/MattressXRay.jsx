'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, DIMENSION_TO_LAYER } from '@/lib/categories';
import { useLastResult } from '@/lib/useLastResult';

const LAYERS = [
  { key: 'cover', title: 'Cover', desc: 'The outermost, breathable layer directly against your skin.' },
  { key: 'comfort', title: 'Comfort layer', desc: 'Contours to pressure points for a balanced, cushioned feel.' },
  { key: 'transition', title: 'Transition layer', desc: 'Smooths the handoff between the soft comfort layer and the firmer support core below.' },
  { key: 'support', title: 'Support core', desc: 'The structural base that keeps the mattress from sagging over time.' },
];

/**
 * A general, illustrative mattress construction diagram - not a per-unit
 * teardown of this specific product (no catalog entry carries that level
 * of internal detail). Click any layer to see which of the real 6
 * scoring dimensions it mainly relates to (see lib/categories.js's
 * DIMENSION_TO_LAYER), and - if this visitor has already scored this
 * exact mattress against their own sleep profile - their real sub-score
 * for it, looked up the same way YourRealScoreForThisMattress.jsx does.
 * No scroll-jacking, no drag gestures: plain buttons, so it works the
 * same way on a trackpad, a touchscreen, or a keyboard.
 */
export default function MattressXRay({ mattressId, coreMaterialNotes }) {
  const [activeLayer, setActiveLayer] = useState('comfort');
  const { payload, hydrated } = useLastResult();

  const fromResults = payload?.results?.find((r) => r.entry.id === mattressId);
  const fromTop = payload?.top?.entry.id === mattressId ? payload.top : null;
  const match = fromResults || fromTop;
  const subScores = match?.result?.subScores ?? null;

  const layer = LAYERS.find((l) => l.key === activeLayer);
  const relatedCategories = CATEGORIES.filter((c) => DIMENSION_TO_LAYER[c.key] === activeLayer);

  return (
    <div className="xray-panel">
      <div className="xray-diagram">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            type="button"
            className={`xray-layer-bar xray-layer-${l.key}${activeLayer === l.key ? ' active' : ''}`}
            aria-pressed={activeLayer === l.key}
            onClick={() => setActiveLayer(l.key)}
          >
            {l.title}
          </button>
        ))}
      </div>

      <div className="xray-detail">
        <h4>{layer.title}</h4>
        <p>{layer.desc}</p>

        {relatedCategories.length > 0 && (
          <div className="xray-scores">
            <span className="xray-scores-label">Scoring dimensions from this layer</span>
            {relatedCategories.map((c) => (
              <div className="xray-score-row" key={c.key}>
                <span>{c.label}</span>
                {subScores ? <b>{subScores[c.key].toFixed(1)}/10</b> : <b className="xray-score-empty">—</b>}
              </div>
            ))}
            {!subScores && (
              <p className="xray-context-note">
                {hydrated ? (
                  <>
                    <Link href="/find-match">Take the quiz</Link> to see your real score for this mattress here.
                  </>
                ) : (
                  'Real scores appear here once you’ve matched against this mattress.'
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {coreMaterialNotes && (
        <p className="xray-materials-note">
          <b>What it&apos;s actually made of:</b> {coreMaterialNotes}
        </p>
      )}
      <p className="xray-disclaimer">
        Illustrative general mattress construction, not a confirmed per-unit teardown of this specific product.
      </p>
    </div>
  );
}
