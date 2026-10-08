'use client';

import Link from 'next/link';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { cx } from '@/components/ui/cx';
import { ordinal } from './productDisplay';
import { useMatchFor } from './useMatchFor';
import { POSITION_SHORT, useStory, type StorySelection } from './ProductStoryContext';
import styles from './ProductStory.module.css';

/** Position chips: You (when a personal score exists) + the four reference positions. */
function PositionChips({ className, label = 'Show the Match Score for' }: { className?: string; label?: string }) {
  const { rows, selected, select, hasYou } = useStory();
  const options: { id: StorySelection; text: string }[] = [
    ...(hasYou ? [{ id: 'you' as const, text: 'You' }] : []),
    ...rows.map((r) => ({ id: r.id, text: POSITION_SHORT[r.id] || r.label })),
  ];
  return (
    <div className={cx(styles.chips, className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={styles.chip} aria-pressed={selected === o.id} onClick={() => select(o.id)}>
          {o.text}
        </button>
      ))}
    </div>
  );
}

/**
 * Hero Match Score module: a real ScoreRing. With a personal result it shows
 * the visitor's score; otherwise the engine's score for the chosen typical
 * sleeper, switchable by position, plus the invitation to get their own.
 */
export function HeroScore() {
  const { view, mattressId, mattressName } = useStory();
  const { hydrated, hasQuiz, item } = useMatchFor(mattressId);
  if (!view || typeof view.score !== 'number') {
    return (
      <div className={styles.heroScore}>
        <p className={styles.kicker}>Match Score</p>
        <p className={styles.invite}>The engine could not score {mattressName} yet.</p>
      </div>
    );
  }
  const you = view.mode === 'you';
  // Live store, not the context's (deferred) `hasYou`: no "filtered out" flash
  // in the moment before the provider adopts the visitor's own result.
  const filteredOut = hydrated && hasQuiz && !item;
  return (
    <div className={styles.heroScore} data-mode={view.mode}>
      <div className={styles.heroScoreTop}>
        <ScoreRing score={view.score} size="lg" label={you ? 'Your Match Score' : `Match Score for a ${view.caption.toLowerCase()}`} />
        <div className={styles.heroScoreText}>
          <p className={styles.kicker}>{you ? 'Your Match Score' : 'Match Score'}</p>
          <p className={styles.tier}>{view.tier}</p>
          <p className={styles.caption} aria-live="polite">
            {view.caption}
            {!you && view.rank ? (
              <>
                {' '}
                · {ordinal(view.rank)} of {view.total} ranked
              </>
            ) : !you ? (
              <> · Not ranked: too little data</>
            ) : null}
          </p>
        </div>
      </div>
      <PositionChips />
      <div className={styles.heroScoreFoot}>
        {you ? (
          <a href="#score" className={styles.footLink}>
            See why it scores {view.score}
            <ArrowDown aria-hidden="true" />
          </a>
        ) : (
          <>
            <p className={styles.invite}>
              {filteredOut ? `Your last quiz filtered ${mattressName} out, so it has no personal score.` : 'Your weight, temperature and partner can move this a lot.'}
            </p>
            <Link href="/find-match" className={styles.footLink}>
              {filteredOut ? 'Retake the quiz' : 'Get your full score'}
              <ArrowRight aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
