import Link from 'next/link';
import type { CompareTopicConfig, ProfileFilter } from '@/lib/compareTopics';
import type { Explanation } from '@/lib/types';
import styles from './Compare.module.css';

interface TopicCriteriaProps {
  why: CompareTopicConfig['why'];
  /** The engine's profile factors for this profile (from the top result's explanation). */
  factors: Explanation['profileFactors'];
  filters: readonly ProfileFilter[];
}

/** "How these were ranked": the topic's sleeper notes, the engine's profile factors and the filters applied before scoring. */
export function TopicCriteria({ why, factors, filters }: TopicCriteriaProps) {
  return (
    <section className="section section--editorial" aria-labelledby="criteria-title">
      <div className="container container--wide">
        <div className={styles.criteria}>
          <header>
            <p className="eyebrow">Criteria</p>
            <h2 id="criteria-title" className="h2">
              How these were ranked.
            </h2>
            <p className={styles.criteriaIntro}>
              The same rules score every mattress. This profile changes how much each dimension counts. Full detail is in the{' '}
              <Link href="/methodology" className="link">
                methodology
              </Link>
              .
            </p>
          </header>
          <div className={styles.criteriaBody}>
            {why.map((w) => (
              <div key={w.title} className={styles.criterion}>
                <h3 className="h4">{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
            {factors.length ? (
              <div className={styles.criterion}>
                <h3 className="h4">What the engine weighed for this profile</h3>
                <dl className={styles.factorList}>
                  {factors.map((f) => (
                    <div key={f.id}>
                      <dt>{f.label}</dt>
                      <dd>{f.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {filters.length ? (
              <div className={styles.criterion}>
                <h3 className="h4">Filters applied before scoring</h3>
                <ul className={styles.filterList}>
                  {filters.map((f) => (
                    <li key={f.id}>{f.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
