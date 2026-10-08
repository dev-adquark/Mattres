import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cx } from '@/components/ui/cx';
import { comfortWindow } from '@/lib/content/bands';
import { POSITIONS } from '@/lib/content/positions';
import type { ScoringRules } from '@/lib/content/types';
import { SLEEP_POSITIONS } from '@/lib/site';
import styles from '../Hub.module.css';

/** "Start with how you sleep": each position with its 130–179 lb comfort window from the rules. */
export function HubPositions({ rules }: { rules: ScoringRules }) {
  return (
    <section className={cx('section section--cinematic', styles.positions)} aria-labelledby="positions-title">
      <div className="container container--wide">
        <div className={styles.positionsHead}>
          <h2 id="positions-title" className="h2">
            Start with how you sleep.
          </h2>
          <p className={styles.positionsIntro}>
            Your position sets where on the firmness scale you belong. Windows shown for 130–179 lb, from scoring rules v
            {rules.version}.{' '}
            <Link href="/sleep-position" className="link">
              Compare all four positions
            </Link>
            .
          </p>
        </div>
        <ul className={styles.positionList}>
          {SLEEP_POSITIONS.map((p) => {
            const [min, max] = comfortWindow(rules, p.slug, '130-180');
            return (
              <li key={p.slug}>
                <Link href={p.href} className={styles.positionLink}>
                  <span className={styles.positionName}>{POSITIONS[p.slug].headline[1]}</span>
                  <span className={styles.positionMeta}>
                    <span className="sr-only">{p.label}: comfort window </span>
                    <span className="tabular">
                      {min}–{max}/10
                    </span>
                  </span>
                  <ArrowUpRight className={styles.positionArrow} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
