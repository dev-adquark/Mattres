'use client';

import { useState } from 'react';
import HeroResultPreview from './HeroResultPreview';

/**
 * A small, clearly-labeled interactive preview: pick one of a few real,
 * disclosed sleep profiles (see app/page.js's PREVIEW_PROFILES) and see
 * that profile's real top match update instantly. Not a 3D visualization
 * or a game - the point is to make "the score changes based on how you
 * sleep" tangible before the visitor commits to the full 60-second quiz.
 */
export default function InteractiveResultPreview({ examples }) {
  const usable = examples.filter((e) => e.example);
  const [activeKey, setActiveKey] = useState(usable[0]?.key);
  const active = usable.find((e) => e.key === activeKey) ?? usable[0];

  if (!active) return null;

  return (
    <div className="interactive-preview">
      <div className="interactive-preview-tabs" role="tablist" aria-label="Choose a sample sleep profile">
        {usable.map((e) => (
          <button
            key={e.key}
            type="button"
            role="tab"
            aria-selected={e.key === active.key}
            className={`interactive-preview-tab${e.key === active.key ? ' active' : ''}`}
            onClick={() => setActiveKey(e.key)}
          >
            {e.label}
          </button>
        ))}
      </div>
      <HeroResultPreview example={active.example} />
    </div>
  );
}
