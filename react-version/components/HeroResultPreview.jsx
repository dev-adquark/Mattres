import Link from 'next/link';
import { formatPrice } from '@/lib/format';

const PREVIEW_CATS = [
  { key: 'pressureRelief', label: 'Pressure Relief' },
  { key: 'heat', label: 'Cooling' },
  { key: 'support', label: 'Support' },
];

/**
 * `example` is a real result item from matchProfile() (see app/page.js's
 * HERO_EXAMPLE_PROFILE) - a real catalog entry scored by the real
 * scoreEngine against a disclosed demo profile, never an invented
 * score. Labeled "Example match" throughout so it's never mistaken for
 * the viewer's own (not-yet-computed) result.
 */
export default function HeroResultPreview({ example }) {
  if (!example) return null;
  const { entry, result, displayTitle } = example;

  return (
    <div className="hero-preview-card" aria-label="Example match result, for a sample sleep profile">
      <span className="hero-preview-tag">Example match</span>
      <div className="hero-preview-score-row">
        <div className="hero-preview-score">
          <span className="hero-preview-num">{result.overallScore}</span>
          <span className="hero-preview-label">Match</span>
        </div>
        <div>
          <div className="hero-preview-name">{displayTitle}</div>
          <div className="hero-preview-meta">
            {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} · {formatPrice(entry)}
          </div>
        </div>
      </div>
      <div className="hero-preview-bars">
        {PREVIEW_CATS.map((c) => (
          <div className="hero-preview-bar-row" key={c.key}>
            <span>{c.label}</span>
            <div className="hero-preview-bar" aria-hidden="true">
              <i style={{ width: `${(result.subScores[c.key] / 10) * 100}%` }} />
            </div>
            <b>{result.subScores[c.key].toFixed(1)}</b>
          </div>
        ))}
      </div>
      <p className="hero-preview-caption">
        A real score for a sample profile.{' '}
        <Link href="/find-match">Your real match</Link> takes about 60 seconds.
      </p>
    </div>
  );
}
