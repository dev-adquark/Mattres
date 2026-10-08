'use client';

import { useEffect, useRef } from 'react';
import { track, EVENTS } from '@/lib/analytics';
import { tierFor } from '@/lib/scoreTiers';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScoreBars } from '@/components/ui/ScoreBars';
import { RiskFlagList } from '@/components/ui/RiskFlagList';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { VerificationLevel } from '@/lib/types';
import { profileSummary } from './lastResult';
import { useMatchFor } from './useMatchFor';
import styles from './ProductPage.module.css';

/**
 * "How it fits you" body: the engine's sub-scores, reasons and watch-outs
 * for the visitor's own profile - or an honest invitation when there is no
 * quiz result for this mattress.
 */
interface YourFitProps {
  mattressId: string;
  mattressName: string;
  /** Render the skeleton / quiz invitation when there is no personal result (false renders nothing). */
  invite?: boolean;
}

export function YourFit({ mattressId, mattressName, invite = true }: YourFitProps) {
  const { hydrated, hasQuiz, item, profile } = useMatchFor(mattressId);

  if (!hydrated) {
    if (!invite) return null;
    return (
      <div className={styles.fitSkeleton} aria-busy="true">
        <Skeleton variant="text" lines={6} />
      </div>
    );
  }

  if (!item) {
    if (!invite) return null;
    return (
      <div className={styles.fitInvite}>
        <h3 className="h3">{hasQuiz ? 'Not in your last results' : 'Score it against your own sleep'}</h3>
        <p className="muted measure">
          {hasQuiz
            ? `Your last quiz answers filtered ${mattressName} out, so there is no personal breakdown for it. Retake the quiz without that limit to see one.`
            : `The bars above show how the engine scores ${mattressName} for typical sleepers. Your own position, weight, temperature and partner can move the score a lot, so the quiz is the only way to see your number.`}
        </p>
        <div>
          <Button href="/find-match" arrow>
            {hasQuiz ? 'Retake the quiz' : 'Get your Match Score'}
          </Button>
        </div>
      </div>
    );
  }

  const { result, explanation } = item;
  const reasons: { text: string }[] = explanation?.reasons || (item.whyThisMatch || []).map((text) => ({ text }));
  const watchOuts = explanation?.watchOuts || result.riskFlags || [];
  const dataNotes = explanation?.dataNotes || [];
  const summary = profileSummary(profile);

  return (
    <div className={styles.fit}>
      <div className={styles.fitScore}>
        <ScoreRing score={result.overallScore} size="lg" label="Your Match Score" />
        <div className={styles.fitScoreText}>
          <p className={styles.fitKicker}>Your Match Score · {(explanation?.tier || tierFor(result.overallScore)).label}</p>
          {explanation?.headline ? <p className={styles.fitHeadline}>{explanation.headline}</p> : null}
          {summary ? <p className="small muted">Profile: {summary}. Model v{result.modelVersion}.</p> : null}
        </div>
      </div>
      <div className={styles.fitBars}>
        <h3 className={styles.fitHeading}>Score by dimension</h3>
        <ScoreBars subScores={result.subScores} provenance={result.dimensionProvenance} dataProvenance={item.dataProvenance} />
      </div>
      <div className={styles.fitWhy}>
        <h3 className={styles.fitHeading}>Why it fits</h3>
        {reasons.length ? (
          <ul className={styles.reasonList}>
            {reasons.map((r, i) => (
              <li key={i}>{r.text}</li>
            ))}
          </ul>
        ) : (
          <p className="small muted">No dimension scored strongly enough on measured data to call out as a clear strength.</p>
        )}
        <h3 className={styles.fitHeading}>Watch out for</h3>
        <RiskFlagList flags={watchOuts} headingLevel="h4" emptyText="No watch-outs for your profile." />
        {dataNotes.length ? (
          <ul className={styles.dataNotes} aria-label="Data notes">
            {dataNotes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/** Fires mattress_viewed once per mount, with whether the visitor has a score for it. */
interface MattressViewedProps {
  mattressId: string;
  brand: string;
  type: string;
  verificationLevel: VerificationLevel | string;
}

export function MattressViewed({ mattressId, brand, type, verificationLevel }: MattressViewedProps): null {
  const { item, hydrated } = useMatchFor(mattressId);
  const hasMatch = Boolean(item);
  // Only once per page view: re-renders from the same mount don't re-fire.
  const firedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || firedFor.current === mattressId) return;
    firedFor.current = mattressId;
    track(EVENTS.MATTRESS_VIEWED, { mattress_id: mattressId, brand, type, verification_level: verificationLevel, has_match: hasMatch });
  }, [hydrated, mattressId, brand, type, verificationLevel, hasMatch]);
  return null;
}
