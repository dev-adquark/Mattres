import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HeadingLevel } from './types';
import styles from './Compare.module.css';

export interface TopicListItem {
  slug: string;
  title: string;
  chips?: readonly string[];
  intro?: string;
}

interface TopicListProps {
  topics: readonly TopicListItem[];
  headingLevel?: HeadingLevel;
  showIntro?: boolean;
}

/** Curated comparison topics as a numbered hairline list (not a card grid). */
export function TopicList({ topics, headingLevel = 'h3', showIntro = true }: TopicListProps) {
  const Heading = headingLevel;
  return (
    <ol className={styles.topicList}>
      {topics.map((t, i) => (
        <li key={t.slug} className={styles.topicItem}>
          <span className={styles.topicNo} aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className={styles.topicBody}>
            <Heading className={styles.topicTitle}>
              <Link href={`/compare/${t.slug}`} className={styles.topicLink}>
                {t.title}
              </Link>
            </Heading>
            {showIntro && t.intro ? <p className={styles.topicIntro}>{t.intro}</p> : null}
            {t.chips && t.chips.length ? (
              <ul className={styles.topicChips} aria-label="Demo profile">
                {t.chips.slice(0, 4).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <ArrowRight className={styles.topicArrow} aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}
