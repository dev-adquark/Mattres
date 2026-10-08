import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import type { CompareTopicConfig } from '@/lib/compareTopics';
import styles from './Compare.module.css';

interface TopicHeroProps {
  topic: Pick<CompareTopicConfig, 'title' | 'h1' | 'intro' | 'chips'>;
  path: string;
  /** How many mattresses fit the profile, and how many are compared. */
  resultCount: number;
  comparedCount: number;
  modelVersion: string | null;
}

/** A topic page's hero: the question, and a disclosure that the scores belong to a demo profile. */
export function TopicHero({ topic, path, resultCount, comparedCount, modelVersion }: TopicHeroProps) {
  return (
    <section className={`section section--cinematic ${styles.topicHero}`} data-nav-theme="dark" aria-labelledby="topic-title">
      <div className="container container--wide">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Compare', href: '/compare' },
            { label: topic.title, href: path },
          ]}
        />
        <div className={styles.topicHeroGrid}>
          <div>
            <p className="eyebrow">Curated comparison</p>
            <h1 id="topic-title" className={`display-l ${styles.topicTitleH1}`}>
              {topic.h1}
            </h1>
            <p className="lead">{topic.intro}</p>
          </div>
          <aside className={styles.demoPanel} aria-labelledby="demo-profile-title">
            <h2 id="demo-profile-title" className={styles.demoTitle}>
              Scored for a demo profile, not for you
            </h2>
            <ul className={styles.demoChips}>
              {topic.chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className={styles.demoNote}>
              {resultCount} {resultCount === 1 ? 'mattress fits' : 'mattresses fit'} this profile. The top {comparedCount} are compared below, ranked by the
              Match Score engine v{modelVersion}.
            </p>
            <Button href="/find-match" variant="onDark" size="sm" arrow magnetic>
              Get scores for you
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}
