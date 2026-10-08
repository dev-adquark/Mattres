'use client';

import { Check, CircleGauge } from 'lucide-react';
import { QUESTION_STEPS, STEPS, validateStep, type QuizAnswers } from './quizModel';
import { cssVars } from '@/components/ui/cssVars';
import styles from './Quiz.module.css';

export type QuizPhase = 'quiz' | 'loading' | 'results';

interface QuizProgressProps {
  /** Current QUESTION_STEPS index (used while phase is 'quiz'). */
  step: number;
  answers: QuizAnswers;
  onJump?: (step: number) => void;
  /** 'loading' and 'results' mark the Results marker as current. */
  phase?: QuizPhase;
}

/**
 * Chapter progress: five numbered questions (01 Sleep · 02 Body ·
 * 03 Comfort · 04 Environment · 05 Priorities), then a separate, unnumbered
 * "Results" marker, so "Step 1 of 5" never contradicts a six-item list.
 * A step is a button (jump back or forward)
 * once every step before it is complete; the current step carries
 * aria-current="step". Completed steps show a check AND the word
 * "complete" for screen readers, never colour alone.
 */
export function QuizProgress({ step, answers, onJump, phase = 'quiz' }: QuizProgressProps) {
  const complete = QUESTION_STEPS.map((s) => Object.keys(validateStep(s.id, answers)).length === 0);
  const reachable = (i: number) => complete.slice(0, i).every(Boolean);
  const currentIndex = phase === 'quiz' ? step : STEPS.length - 1;
  const pct = ((currentIndex + (phase === 'results' ? 1 : 0.5)) / STEPS.length) * 100;

  return (
    <nav className={styles.progress} aria-label="Quiz progress" style={cssVars({ '--progress': `${pct}%` })}>
      <ol className={styles.progressList}>
        {STEPS.map((s, i) => {
          const isCurrent = i === currentIndex;
          const question = QUESTION_STEPS[i];
          // Priorities is all-optional, so it only counts as done once passed.
          const isDone = question ? !!complete[i] && !isCurrent && (i < currentIndex || question.id !== 'priorities') : phase === 'results';
          const canJump = phase === 'quiz' && !!question && !isCurrent && reachable(i) && !!onJump;
          const inner = (
            <>
              <span className={styles.progressIndex} aria-hidden="true">
                {isDone ? <Check strokeWidth={2.5} /> : question ? s.index : <CircleGauge strokeWidth={1.75} />}
              </span>
              <span className={styles.progressLabel}>{s.label}</span>
              {isDone ? <span className="sr-only"> (complete)</span> : null}
            </>
          );
          return (
            <li key={s.id} className={styles.progressItem} data-results={question ? undefined : ''} data-current={isCurrent ? '' : undefined} data-done={isDone ? '' : undefined}>
              {canJump ? (
                <button type="button" className={styles.progressBtn} onClick={() => onJump?.(i)}>
                  {inner}
                </button>
              ) : (
                <span className={styles.progressBtn} aria-current={isCurrent ? 'step' : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <span className={styles.progressBar} aria-hidden="true" />
    </nav>
  );
}
