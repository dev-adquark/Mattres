'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { QuizProgress } from './QuizProgress';
import type { QuizAnswers } from './quizModel';
import { QuizFooter } from './QuizFooter';
import styles from './Results.module.css';

export const LOADING_STAGES: readonly string[] = [
  'Analyzing your sleep profile…',
  'Comparing mattress characteristics…',
  'Finding your strongest matches…',
];

interface MatchLoadingProps {
  answers: QuizAnswers;
  catalogCount: number;
  /** Delay between stages (0 under reduced motion). */
  stageMs?: number;
}

/**
 * Contextual loading moment while /api/match runs. Three staged messages,
 * each ticked off in turn (MatchExperience keeps this on screen for at
 * least ~1.5s; under reduced motion it shows only as long as the request
 * takes). The current stage is announced politely. Focus moves to the
 * heading so keyboard and screen-reader users know the page changed.
 */
export function MatchLoading({ answers, catalogCount, stageMs = 520 }: MatchLoadingProps) {
  const [stage, setStage] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    const timers = LOADING_STAGES.slice(1).map((_, i) => setTimeout(() => setStage(i + 1), stageMs * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [stageMs]);

  return (
    <section className={`section section--cinematic ${styles.loading}`} data-nav-theme="dark" aria-labelledby="match-loading-title" aria-busy="true">
      <div className={`container container--wide ${styles.loadingLayout}`}>
        <QuizProgress step={5} answers={answers} phase="loading" />
        <div className={styles.loadingBody}>
          <p className="eyebrow">Your results</p>
          <h1 id="match-loading-title" ref={headingRef} tabIndex={-1} className={styles.loadingTitle}>
            Scoring {catalogCount ? `${catalogCount} mattresses` : 'the catalog'} for <em>you.</em>
          </h1>
          <ol className={styles.stages}>
            {LOADING_STAGES.map((text, i) => (
              <li key={text} data-state={i < stage ? 'done' : i === stage ? 'active' : 'waiting'}>
                <span className={styles.stageMark} aria-hidden="true">
                  {i < stage ? <Check strokeWidth={2.5} /> : <span />}
                </span>
                <span>{text}</span>
                {i < stage ? <span className="sr-only"> Done.</span> : null}
              </li>
            ))}
          </ol>
          <p className="sr-only" role="status" aria-live="polite">
            {LOADING_STAGES[stage]}
          </p>
          <div className={styles.scan} aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
      <QuizFooter />
    </section>
  );
}
