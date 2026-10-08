'use client';

import { useEffect, useRef } from 'react';
import { CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { MatchErrorKind } from './matchApi';
import { QuizFooter } from './QuizFooter';
import styles from './Results.module.css';

interface MatchErrorProps {
  kind: MatchErrorKind | null;
  onRetry: () => void;
  onReview: () => void;
}

/** Scoring failed (rate limit, offline, server): say so plainly, keep the answers, offer retry or review. */
export function MatchError({ kind, onRetry, onReview }: MatchErrorProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className={`section section--cinematic ${styles.state}`} data-nav-theme="dark" aria-labelledby="match-error-title">
      <div className="container container--narrow">
        <CloudOff className={styles.stateIcon} aria-hidden="true" strokeWidth={1.25} />
        <p className="eyebrow">Your results</p>
        <h1 id="match-error-title" ref={headingRef} tabIndex={-1} className={styles.stateTitle}>
          We couldn’t calculate this match right now.
        </h1>
        <p className={styles.stateText} role="alert">
          {kind === 'rate'
            ? 'Too many matches were requested in the last minute. Wait a moment, then try again.'
            : kind === 'offline'
              ? 'Your connection seems to be offline. Check it, then try again.'
              : 'Something went wrong on our side while scoring.'}{' '}
          Your answers are saved, so nothing needs to be re-entered.
        </p>
        <div className={styles.stateActions}>
          <Button variant="primary" arrow onClick={onRetry}>
            Try again
          </Button>
          <Button variant="secondary" onClick={onReview}>
            Review my answers
          </Button>
        </div>
      </div>
      <QuizFooter />
    </section>
  );
}
