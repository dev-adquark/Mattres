'use client';

import Link from 'next/link';
import NumberTicker from './NumberTicker';
import { useLastResult } from '@/lib/useLastResult';

/**
 * Looks up this specific mattress inside the visitor's real last quiz
 * result (if any) - not just whichever mattress happened to be their top
 * match. Requires the full `results` array to be present in the stored
 * payload (added alongside this component); older stored payloads from
 * before that change only have `top`, so this also checks that as a
 * fallback rather than showing nothing for someone whose session predates
 * the update.
 */
export default function YourRealScoreForThisMattress({ mattressId }) {
  const { payload, hydrated } = useLastResult();

  if (!hydrated) return null;

  const fromResults = payload?.results?.find((r) => r.entry.id === mattressId);
  const fromTop = payload?.top?.entry.id === mattressId ? payload.top : null;
  const match = fromResults || fromTop;

  if (!match) {
    return (
      <div className="md-side-card">
        <h5>Your real score for this mattress</h5>
        <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: '0 0 14px' }}>
          You haven&apos;t scored this mattress against your own sleep profile yet — every score here is computed
          live, never guessed.
        </p>
        <Link href="/find-match" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Take the quiz
        </Link>
      </div>
    );
  }

  const { result } = match;
  return (
    <div className="md-score-box">
      <h5 style={{ color: '#fff', fontSize: 14, margin: '0 0 6px' }}>Your real Match Score</h5>
      <div className="score-big">
        <NumberTicker value={result.overallScore} suffix="/100" />
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-dim)', margin: '10px 0 0' }}>
        Computed live from the sleep profile you entered — model {result.modelVersion}.
      </p>
      {result.riskFlags?.length > 0 && (
        <p style={{ fontSize: 12, color: '#fbbf24', margin: '10px 0 0' }}>
          {result.riskFlags.length} real risk flag{result.riskFlags.length > 1 ? 's' : ''} for your profile — see the
          full breakdown on your results.
        </p>
      )}
    </div>
  );
}
