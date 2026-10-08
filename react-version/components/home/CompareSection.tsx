import Link from 'next/link';
import { Chapter } from '@/components/motion';
import type { SleepPosition, SleepProfile } from '@/lib/types';
import { CompareTable } from './CompareTable';
import { MOTION_WORD, TEMP_WORD } from './homeConfig';
import { SleepDiscovery } from './SleepDiscovery';
import { TrackedButton } from './TrackedButton';
import type { HomeCompare, SleepCategoryCard } from './types';
import styles from './Home.module.css';

const PROFILE_TEXT: Record<SleepPosition, string> = {
  side: 'Side sleeper',
  back: 'Back sleeper',
  stomach: 'Stomach sleeper',
  combination: 'Combination sleeper',
};

/** "Side sleeper, 155 lb, prefers medium firm, sleeps hot, sleeps alone". */
function describeProfile(profile: SleepProfile): string {
  return [
    PROFILE_TEXT[profile.sleepPosition],
    `${profile.weightLb} lb`,
    `prefers ${profile.preferredFirmnessLabel.replace('-', ' ')}`,
    TEMP_WORD[profile.sleepTemperature],
    profile.motionSensitivity ? MOTION_WORD[profile.motionSensitivity] : null,
  ]
    .filter(Boolean)
    .join(', ');
}

interface CompareSectionProps {
  compare: HomeCompare;
  bySleep?: SleepCategoryCard[];
}

/**
 * Chapter 05 - Compare. A real three-way comparison for a disclosed demo
 * profile (the table snaps column by column on phones), then the
 * "Discover by how you sleep" slider: live category counts and the engine's
 * top pick for each category's stated profile.
 */
export function CompareSection({ compare, bySleep = [] }: CompareSectionProps) {
  const { profile, finalists } = compare;
  const profileLine = describeProfile(profile);
  const ids = finalists.map((f) => f.id);

  return (
    <section id="compare" className={`section--linen ${styles.compare} ${styles.seamDawn}`} data-nav-theme="light" aria-labelledby="compare-title">
      <div className="container container--wide">
        {finalists.length >= 2 ? (
          <div className={styles.compareGrid}>
            <div className={styles.compareIntro}>
              <Chapter index={5} label="Compare" />
              <h2 id="compare-title" className={`display ${styles.compareTitle}`}>
                Compare your <em>finalists.</em>
              </h2>
              <p className="lead">
                Side by side, dimension by dimension, with the gaps in the data marked. Here are the top three for one example sleeper.
              </p>
              <p className={styles.compareProfile}>
                <span className={styles.compareProfileLabel}>Example profile</span>
                {profileLine}
              </p>
              <div className={styles.compareActions}>
                <TrackedButton
                  href={`/compare?ids=${ids.map(encodeURIComponent).join(',')}`}
                  size="lg"
                  arrow
                  event="comparison_started"
                  eventProps={{ count: ids.length, source: 'home' }}
                >
                  Open this comparison
                </TrackedButton>
                <Link href="/mattresses" className="link">
                  Or pick your own from the catalog
                </Link>
              </div>
            </div>

            <CompareTable finalists={finalists} profileLine={profileLine} />
          </div>
        ) : (
          <Chapter index={5} label="Compare" />
        )}

        {bySleep.length ? <SleepDiscovery categories={bySleep} /> : null}
      </div>
    </section>
  );
}
