'use client';

import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { tierFor } from '@/lib/scoreTiers';
import { useProfileScores } from './useProfileScores';
import type { PairNames, PairSideKey } from './types';
import styles from './Pair.module.css';

interface PairPersonalProps {
  /** Mattress ids. */
  a: string;
  b: string;
  names: PairNames;
}

/**
 * "For your profile: A 84 · B 79" when this browser holds a quiz result
 * (sessionStorage, scored by the real engine via /api/match); otherwise an
 * honest invitation to get scores. Nothing is shown before hydration.
 */
export function PairPersonal({ a, b, names }: PairPersonalProps) {
  const ids = useMemo(() => [a, b], [a, b]);
  const { status, items, retry } = useProfileScores(ids);

  if (status === 'pending') return <div className={styles.personal} aria-hidden="true" data-state="pending" />;

  const itemA = items[a];
  const itemB = items[b];
  if (status === 'ready' && itemA && itemB) {
    const sa = itemA.result.overallScore;
    const sb = itemB.result.overallScore;
    const lead: PairSideKey | null = sa === sb ? null : sa > sb ? 'a' : 'b';
    const gap = Math.abs(sa - sb);
    return (
      <div className={styles.personal} data-state="ready">
        <p className={styles.personalLabel}>For your profile</p>
        <p className={styles.personalScores}>
          <span data-lead={lead === 'a' ? 'true' : undefined}>
            {names.a} <strong>{sa}</strong>
            <span className="sr-only"> out of 100, {tierFor(sa).label}</span>
          </span>
          <span className={styles.personalSep} aria-hidden="true">
            ·
          </span>
          <span data-lead={lead === 'b' ? 'true' : undefined}>
            {names.b} <strong>{sb}</strong>
            <span className="sr-only"> out of 100, {tierFor(sb).label}</span>
          </span>
        </p>
        <p className={styles.personalNote}>
          {lead ? `${gap} ${gap === 1 ? 'point' : 'points'} apart, from your quiz answers on this device.` : 'A tie on your quiz answers.'}
        </p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={styles.personal} data-state="loading" role="status">
        <p className={styles.personalLabel}>For your profile</p>
        <p className={styles.personalNote}>Scoring both for your sleep profile…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.personal} data-state="error" role="alert">
        <p className={styles.personalLabel}>For your profile</p>
        <p className={styles.personalNote}>We couldn’t score these for your profile just now.</p>
        <button type="button" className={styles.textBtn} onClick={retry}>
          <RotateCcw aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.personal} data-state="none">
      <p className={styles.personalLabel}>For your profile</p>
      <p className={styles.personalNote}>These scores are for reference sleepers. Answer a few questions and both get a Match Score for you.</p>
      <Button href="/find-match" size="sm" variant="secondary" arrow>
        Get your scores
      </Button>
    </div>
  );
}
