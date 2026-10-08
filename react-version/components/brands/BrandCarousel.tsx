import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Slider } from '@/components/motion';
import { MattressRender } from '@/components/ui/MattressRender';
import type { MattressType } from '@/lib/types';
import { ConstructionBar } from './ConstructionBar';
import { positionLabel, typeWord } from './brandCopy';
import { ordinal } from './brandData';
import type { TypeMixItem } from './brandData';
import styles from './Brands.module.css';

/** One brand slide, computed on the server from the catalog and engine output. */
export interface BrandCarouselItem {
  slug: string;
  name: string;
  count: number;
  mix: TypeMixItem[];
  type: MattressType | null;
  seed: string;
  /** Highest reference score across the four reference sleepers, with its model. */
  top: { score: number; model: string; position: string } | null;
  /** Best placing among the ranked set, or null when no model has enough backed data to rank. */
  place: { rank: number; total: number; position: string; model: string } | null;
}

/**
 * The brand carousel on /brands: every catalog brand, A–Z, with its real model
 * count and its engine numbers for the disclosed reference sleepers. Built on
 * the shared <Slider>; no brand is promoted, the order is alphabetical.
 */
export function BrandCarousel({ items, maxCount }: { items: readonly BrandCarouselItem[]; maxCount: number }) {
  return (
    <Slider
      id="brand-carousel"
      label="Mattress brands"
      perView={{ base: 1.2, sm: 1.9, md: 2.6, lg: 3.4, xl: 4.2 }}
      controls="top"
      progress="bar"
      bleed
      header={
        <div className={styles.railHead}>
          <h2 id="brand-rail-title" className={styles.railTitle}>
            Every brand, <em>A–Z.</em>
          </h2>
          <p className={styles.railNote}>Engine scores for the reference sleepers: 160 lb, sleeps alone, no firmness preference.</p>
        </div>
      }
      className={styles.railSlider}
    >
      {items.map((b) => (
        <article key={b.slug} className={styles.railCard} aria-labelledby={`rail-${b.slug}`}>
          <Link href={`/brands/${b.slug}`} className={styles.railLink}>
            <span className={styles.railMedia} aria-hidden="true">
              <MattressRender type={b.type} seed={b.seed} aspect="product" size="fluid" fill sizes="(min-width: 1200px) 24vw, (min-width: 640px) 45vw, 80vw" />
              <span className={`illus-tag ${styles.railTag}`}>Illustration{b.type ? ` · ${typeWord(b.type)}` : ''}</span>
            </span>
            <span className={styles.railBody}>
              <h3 id={`rail-${b.slug}`} className={styles.railName}>
                {b.name}
                <ArrowRight aria-hidden="true" />
              </h3>
              <ConstructionBar mix={b.mix} max={maxCount} />
              <dl className={styles.railStats}>
                <div>
                  <dt>Best score</dt>
                  <dd>
                    {b.top ? (
                      <>
                        <span className={styles.railNum}>{b.top.score}</span>
                        <span className={styles.railSub}>
                          {b.top.model}, {positionLabel(b.top.position)} sleeper
                        </span>
                      </>
                    ) : (
                      <span className={styles.railSub}>Not scored</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Best placing</dt>
                  <dd>
                    {b.place ? (
                      <>
                        <span className={styles.railNum}>{ordinal(b.place.rank)}</span>
                        <span className={styles.railSub}>
                          of {b.place.total} ranked, {positionLabel(b.place.position)} sleeper
                        </span>
                      </>
                    ) : (
                      <span className={styles.railSub}>Not ranked: too little backed data</span>
                    )}
                  </dd>
                </div>
              </dl>
            </span>
          </Link>
        </article>
      ))}
    </Slider>
  );
}
