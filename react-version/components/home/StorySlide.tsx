import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { colourwayForSlot } from '@/components/ui/render-stills/stills';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { PriceValue, DataValue } from '@/components/ui/DataValue';
import type { StorySlideData } from './types';
import styles from './Inspect.module.css';

interface StorySlideProps {
  slide: StorySlideData;
  index: number;
  /** This visitor's own Match Score for the slide, when they have a profile. */
  score: number | undefined;
}

/** One product-story slide: only fields on file, a score ring only when the visitor has one. */
export function StorySlide({ slide: s, index, score }: StorySlideProps) {
  const href = `/mattress/${encodeURIComponent(s.id)}`;
  const scored = typeof score === 'number';
  return (
    <article className={styles.slide}>
      <Link href={href} className={styles.slideMedia} tabIndex={-1} aria-hidden="true">
        <span className={styles.slideImage}>
          <MattressRender type={s.type} seed={s.id} colourway={colourwayForSlot(index, 'dark')} aspect="card" fill photo={s.photo} photoCreditLink={false} sizes="(min-width: 1200px) 38vw, (min-width: 640px) 56vw, 85vw" />
        </span>
        {s.photo ? null : <span className={`illus-tag ${styles.slideTag}`}>Illustration</span>}
        <span className={styles.slideIndex}>{String(index + 1).padStart(2, '0')}</span>
      </Link>
      <div className={styles.slideBody}>
        <div className={styles.slideTop}>
          <div className={styles.slideNames}>
            <p className={styles.slideBrand}>{s.brand}</p>
            <h4 className={styles.slideTitle}>
              <Link href={href} className={styles.slideLink}>
                {s.title}
              </Link>
            </h4>
          </div>
          {scored ? (
            <div className={styles.slideScore}>
              <ScoreRing score={score} size="sm" label={`Your Match Score for ${s.title}`} />
            </div>
          ) : null}
        </div>
        <p className={styles.slidePositioning}>{s.positioning}</p>
        {s.attributes.length ? (
          <dl className={styles.slideAttrs}>
            {s.attributes.map((a) => (
              <div key={a.label}>
                <dt>{a.label}</dt>
                <dd className="tabular">{a.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <dl className={styles.slideMore}>
          <div>
            <dt>Trial</dt>
            <dd>
              <DataValue value={s.trialDays} suffix=" nights" />
            </dd>
          </div>
          <div>
            <dt>Queen</dt>
            <dd>
              <PriceValue entry={{ priceUsd: s.priceUsd, priceFromUsd: s.priceFromUsd ?? undefined }} />
            </dd>
          </div>
        </dl>
        <div className={styles.slideActions}>
          {scored ? (
            <Link href={href} className={styles.slideCta}>
              Why it scores {score} <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Link href="/find-match" className={styles.slideCta}>
              Score it for me <ArrowRight aria-hidden="true" />
              <span className="sr-only"> (find your match to see a score for {s.title})</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
