import { Chapter } from '@/components/motion';
import { MatchPreview } from './MatchPreview';
import { ScoreAnatomy } from './ScoreAnatomy';
import type { HomeAnatomy, HomePreview } from './types';
import styles from './Match.module.css';
import home from './Home.module.css';

interface MatchChapterProps {
  preview: HomePreview;
  anatomy: HomeAnatomy;
}

/**
 * Chapter 03 - Match. Split 5/7: sticky controls beside a live surface and
 * the engine's top match; then the score anatomy as its own full-width row
 * (ring left, weights right, tiers across all twelve columns), so neither
 * column ever runs empty. The section shell and
 * heading render on the server; MatchPreview and ScoreAnatomy are the two
 * interactive islands.
 */
export function MatchChapter({ preview, anatomy }: MatchChapterProps) {
  const heading = (
    <>
      <Chapter index={3} label="Match" />
      <h2 id="match-title" className={styles.title}>
        Your mattress should adapt to <em>your sleep.</em>
      </h2>
    </>
  );

  return (
    <section id="match" className={`mood-dark ${styles.match} ${home.seamDusk}`} aria-labelledby="match-title">
      <div className="container container--wide">
        <MatchPreview preview={preview} heading={heading} />
        <ScoreAnatomy anatomy={anatomy} />
      </div>
    </section>
  );
}
