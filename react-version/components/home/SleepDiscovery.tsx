import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { colourwayForSlot } from '@/components/ui/render-stills/stills';
import { Slider } from '@/components/motion';
import type { SleepCategoryCard } from './types';
import styles from './Home.module.css';

/** Mirrors the destination page's "N mattresses · M ranked" line. */
function CategoryCount({ shown, ranked }: { shown: number; ranked: number }) {
  return (
    <>
      <span className="tabular">{ranked}</span> of <span className="tabular">{shown}</span> ranked
    </>
  );
}

/** "Discover by how you sleep": each category page's own No. 1 and ranked count (homeSections.buildSleepCategory). */
export function SleepDiscovery({ categories }: { categories: SleepCategoryCard[] }) {
  return (
    <div className={styles.sleepDiscover}>
      <Slider
        label="Discover by how you sleep"
        id="home-discovery"
        perView={{ base: 1.25, sm: 2.1, md: 2.8, lg: 3.6, xl: 4.2 }}
        controls="top"
        progress="bar"
        bleed
        header={
          <div className={styles.sleepHead}>
            <h3 className={styles.sleepTitle}>
              Discover by <em>how you sleep.</em>
            </h3>
            <p className={styles.sleepLead}>Each card shows the No. 1 from the page it opens: same reference sleeper, same score, same integrity rule.</p>
          </div>
        }
      >
        {categories.map((c, i) => (
          <Link key={c.slug} href={c.href} className={styles.sleepCard}>
            <span className={styles.sleepMedia}>
              <MattressRender type={c.type} seed={c.seed} colourway={colourwayForSlot(i, 'light')} aspect="card" fill sizes="(min-width: 1200px) 26vw, (min-width: 640px) 45vw, 78vw" />
              <span className={`illus-tag ${styles.sleepTag}`}>Illustration</span>
            </span>
            <span className={styles.sleepName}>
              {c.title}
              <ArrowUpRight aria-hidden="true" />
            </span>
            <span className={styles.sleepCount}>
              <CategoryCount shown={c.shown} ranked={c.ranked} />
            </span>
            {c.top ? (
              <span className={styles.sleepTop}>
                <span className={styles.sleepTopLabel}>Ranked No. 1</span>
                <span className={styles.sleepTopName}>
                  {c.top.title}{' '}
                  <span className="tabular" title={c.top.metricLabel}>
                    {c.top.display}
                  </span>
                </span>
                <span className={styles.sleepProfile}>
                  {c.top.metricKind === 'rating'
                    ? c.top.metricLabel
                    : c.profileLabel
                      ? `Match Score for the reference ${c.profileLabel.toLowerCase()}`
                      : c.top.metricLabel}
                </span>
              </span>
            ) : null}
          </Link>
        ))}
      </Slider>
    </div>
  );
}
