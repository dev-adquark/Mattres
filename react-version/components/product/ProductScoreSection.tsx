import Link from 'next/link';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Chapter } from '@/components/motion';
import { YourFit } from './ProductPersonal';
import { PositionBars } from './PositionBars';
import { REFERENCE_PROFILE_TEXT } from './referenceScores';
import styles from './ProductPage.module.css';

interface ProductScoreSectionProps {
  mattressId: string;
  name: string;
  modelVersion: string | null;
}

/** Chapter 2: the visitor's own breakdown (when they have one) and the engine score for each reference position. */
export function ProductScoreSection({ mattressId, name, modelVersion }: ProductScoreSectionProps) {
  return (
    <Section mood="editorial" id="score" className={styles.scoreSection} aria-labelledby="score-title">
      <div className={styles.scoreGrid}>
        <header className={styles.scoreHead}>
          <Chapter index={1} label="Match Score" />
          <h2 id="score-title" className={styles.h2}>
            Scored for the way people sleep.
          </h2>
          <p className={styles.lead}>The same engine as the quiz, run for a typical sleeper in each position. {REFERENCE_PROFILE_TEXT}</p>
          <p className={styles.fine}>
            Model v{modelVersion}. Rank is among the mattresses with enough data to rank, for that same sleeper, as on the category pages.{' '}
            <Link href="/methodology" className="link">
              How scores work
            </Link>
          </p>
          <Button href="/find-match" arrow className={styles.scoreCta}>
            Get your full score
          </Button>
        </header>
        <div className={styles.scoreBody}>
          <YourFit mattressId={mattressId} mattressName={name} invite={false} />
          <PositionBars />
        </div>
      </div>
    </Section>
  );
}
