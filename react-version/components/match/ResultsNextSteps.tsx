import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { SleepProfile } from '@/lib/types';
import { readingFor, rankingsFor } from './nextSteps';
import styles from './Results.module.css';

interface ResultsNextStepsProps {
  /** The Sleep Profile that was scored; every link is derived from it. */
  profile: SleepProfile | null | undefined;
}

/** "Read for your profile": rankings and guides picked from the answers (lib registries only). */
export function ResultsNextSteps({ profile }: ResultsNextStepsProps) {
  const reading = readingFor(profile);
  const rankings = rankingsFor(profile);
  return (
    <section className={`section section--linen ${styles.next}`} aria-labelledby="next-title">
      <div className={`container container--wide ${styles.nextGrid}`}>
        <div className={styles.nextIntro}>
          <p className="eyebrow">Keep going</p>
          <h2 id="next-title" className={styles.nextTitle}>
            Read for your profile
          </h2>
          <p className={styles.sectionIntro}>Picked from your answers, not from what we’d like to sell.</p>
          {rankings.length ? (
            <ul className={styles.rankLinks}>
              {rankings.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className={styles.rankLink}>
                    <span>{r.label}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {reading.length ? (
          <ol className={styles.reading}>
            {reading.map((r, i) => (
              <li key={r.id}>
                <Link href={r.href} className={styles.readingLink}>
                  <span className={`tabular ${styles.readingIndex}`} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.readingBody}>
                    <span className={styles.readingKind}>{r.kind}</span>
                    <span className={styles.readingTitle}>{r.title}</span>
                    <span className={styles.readingWhy}>{r.why}</span>
                  </span>
                  <ArrowUpRight className={styles.readingArrow} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
