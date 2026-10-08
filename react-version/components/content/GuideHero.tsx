import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { cx } from '@/components/ui/cx';
import { EDITORIAL_BYLINE, GUIDES, formatEditorialDate, guideCategoryLabel, guideNumber } from '@/lib/content/guides';
import type { ScoringRules } from '@/lib/content/types';
import type { Guide, MattressEntry } from '@/lib/types';
import { GuideCover } from './GuideCover';
import { EmphasisTitle } from './EmphasisTitle';
import { coverCaption } from './guideCoverCaption';
import styles from './Content.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

interface GuideHeroProps {
  guide: Guide;
  rules: ScoringRules;
  catalog: MattressEntry[];
}

/** Guide masthead: breadcrumb, category and number, H1, cover with caption, standfirst and byline. */
export function GuideHero({ guide, rules, catalog }: GuideHeroProps) {
  const revised = guide.updated && guide.updated !== guide.published;
  const number = guideNumber(guide.slug);
  return (
    <section className={cx('section section--editorial', styles.guideHero)} aria-labelledby="guide-title">
      <div className="container container--wide">
        <Breadcrumbs
          className={styles.crumbs}
          items={[
            { label: 'Home', href: '/' },
            { label: 'Sleep guides', href: '/guides' },
            { label: guide.title, href: guide.path },
          ]}
        />
        <div className={styles.heroTop}>
          <p className={styles.heroKicker}>
            <Link href={`/guides#${guide.category}`} className={styles.heroCat}>
              {guideCategoryLabel(guide.category)}
            </Link>
            <span className={styles.heroNo}>
              Guide {pad(number)} <span aria-hidden="true">/</span>
              <span className="sr-only">of</span> {pad(GUIDES.length)}
            </span>
          </p>
          <h1 id="guide-title" className={styles.heroTitle}>
            <EmphasisTitle title={guide.title} emphasis={guide.emphasis} />
          </h1>
        </div>
        <figure className={styles.heroCover}>
          <GuideCover guide={guide} variant="hero" catalog={catalog} preload showNumber={false} />
          <figcaption className={styles.heroCoverCaption}>
            {coverCaption(guide, rules)} Right: an original rendered illustration, not a product photo.
          </figcaption>
        </figure>
        <div className={styles.heroFoot}>
          <p className={cx('lead', styles.heroDek)}>{guide.dek}</p>
          <dl className={styles.byline}>
            <div>
              <dt>Written by</dt>
              <dd>{EDITORIAL_BYLINE}</dd>
            </div>
            <div>
              <dt>{revised ? 'Last updated' : 'Published'}</dt>
              <dd>
                <time dateTime={guide.updated}>{formatEditorialDate(guide.updated)}</time>
              </dd>
            </div>
            {revised ? (
              <div>
                <dt>First published</dt>
                <dd>
                  <time dateTime={guide.published}>{formatEditorialDate(guide.published)}</time>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
