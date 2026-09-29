import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import MattressThumb from './MattressThumb';

/**
 * `top` is either null (no quiz taken this session - renders the exact
 * same honest "Take the quiz to see your match" state the original
 * project's pre-quiz markup used) or a real result item from the API
 * ({ entry, result, badge, displayTitle, ... }).
 */
export default function MatchedMattressPanel({ top }) {
  return (
    <div className="matched-mattress-panel">
      <div className="mmp-visual">
        <div className="mmp-thumb-wrap">
          {top ? (
            <MattressThumb entry={top.entry} />
          ) : (
            <svg className="mattress-thumb mmp-thumb-placeholder" viewBox="0 0 64 40" aria-hidden="true">
              <rect x="2" y="12" width="60" height="22" rx="6" fill="#1a3350" />
              <rect x="2" y="12" width="60" height="7" rx="6" fill="rgba(255,255,255,0.08)" />
              <rect x="5" y="4" width="18" height="11" rx="5.5" fill="rgba(255,255,255,0.15)" />
            </svg>
          )}
        </div>
        {top && (
          <div className="mmp-seal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
              <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified match
          </div>
        )}
      </div>
      <div className="mmp-info">
        <div className="mmp-eyebrow-row">
          <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
            Your matched mattress
          </span>
          {top && <span className="mmp-rank-badge">Ranked #1</span>}
        </div>
        <h3>{top ? top.displayTitle : 'Take the quiz to see your match'}</h3>
        <p>
          {top
            ? `${top.entry.type.charAt(0).toUpperCase() + top.entry.type.slice(1)} · ${formatPrice(top.entry)} · matched to your profile with a real score of ${top.result.overallScore}/100.`
            : "Answer a few questions and we'll show exactly which mattress in the catalog fits your profile best — with its real score, not a placeholder."}
        </p>
        {top && (
          <div className="mmp-swatches">
            <div className="mmp-swatch">
              <span className="sw-dot sw-cover" />
              Cover fabric
            </div>
            <div className="mmp-swatch">
              <span className="sw-dot sw-foam" />
              Comfort foam
            </div>
            <div className="mmp-swatch">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M3 9h18M8 4v17" strokeOpacity="0.5" />
              </svg>
              <span>{top.entry.trialDays}-night trial</span>
            </div>
          </div>
        )}
        <Link href="/find-match" className="btn btn-primary">
          {top ? 'View full breakdown' : 'Start Your Sleep Profile'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
