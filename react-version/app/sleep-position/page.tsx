import Link from 'next/link';
import rules from '@/lib/rules/0.2.json';
import { SLEEP_POSITIONS } from '@/lib/site';
import { positionPageTitle, POSITION_UPDATED } from '@/lib/content/positions';
import { formatEditorialDate, getGuide } from '@/lib/content/guides';
import { relatedForPosition } from '@/lib/content/links';
import { collectionJsonLd, editorialMetadata } from '@/lib/content/seo';
import type { Guide } from '@/lib/types';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/ui/JsonLd';
import { cx } from '@/components/ui/cx';
import { RangeChart, bandRowsForWeight } from '@/components/content/RangeChart';
import { GuideCarousel } from '@/components/content/GuideCarousel';
import { ContentCta } from '@/components/content/ContentCta';
import { PositionHubCard } from '@/components/content/PositionHubCard';
import styles from '@/components/content/PositionHub.module.css';

const TITLE = 'Sleep positions';
const DESCRIPTION =
  'Side, back, stomach or combination: how each sleep position changes the firmness window and what the Match Score engine weights most, with a ranked list for each.';
const PATH = '/sleep-position';

export const metadata = editorialMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function SleepPositionHub() {
  const guideSlugs = [...new Set(SLEEP_POSITIONS.flatMap((p) => relatedForPosition(p.slug).guides.map((g) => g.slug)))];
  const guides = guideSlugs.map(getGuide).filter((g): g is Guide => g !== null);

  return (
    <>
      <section className={cx('section section--cinematic', styles.hero)} data-nav-theme="dark" aria-labelledby="hub-title">
        <div className="container container--wide">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: TITLE, href: PATH }]} />
          <div className={styles.heroGrid}>
            <div className={styles.heroText}>
              <p className={styles.kicker}>Sleep positions</p>
              <h1 id="hub-title" className={styles.title}>
                How you lie decides <em>what you need.</em>
              </h1>
              <p className={styles.lead}>
                Your position sets where on the firmness scale you belong and which parts of a mattress the engine weights
                most. Pick yours to read the guide, or jump straight to a ranked list.
              </p>
            </div>
            <figure className={styles.chart}>
              <RangeChart
                caption="Comfort window by sleep position, 130–179 lb"
                rowHeader="Sleep position"
                rows={bandRowsForWeight(rules, '130-180')}
              />
              <figcaption className={styles.chartNote}>
                Firmness on a 1–10 scale, from scoring rules v{rules.version}. Updated{' '}
                <time dateTime={POSITION_UPDATED}>{formatEditorialDate(POSITION_UPDATED)}</time>.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section section--editorial" aria-labelledby="positions-title">
        <div className="container container--wide">
          <h2 id="positions-title" className="sr-only">
            The four sleep positions
          </h2>
          <ol className={styles.grid}>
            {SLEEP_POSITIONS.map((p, i) => (
              <PositionHubCard key={p.slug} position={p} index={i} rules={rules} />
            ))}
          </ol>
          <p className={styles.note}>
            Weights shown for each position’s example profile at the default answers for everything else. Your own answers
            (temperature, partner, pain, edge, weight) move them further.{' '}
            <Link href="/methodology" className="link">
              How the weights work
            </Link>
            .
          </p>
        </div>
      </section>

      {guides.length ? (
        <section className={cx('section section--editorial section--linen', styles.shelf)} aria-labelledby="pos-guides-title">
          <div className="container container--wide">
            <GuideCarousel
              id="positions-guides"
              label="Guides for every sleep position"
              guides={guides}
              header={
                <h2 id="pos-guides-title" className="h2">
                  Go deeper
                </h2>
              }
            />
          </div>
        </section>
      ) : null}

      <ContentCta
        id="positions-cta"
        title="Not sure which one you are?"
        body="Most people change position through the night. Pick combination in the quiz and the engine balances the windows for you."
        secondary={{ href: '/guides', label: 'All sleep guides' }}
      />

      <JsonLd
        data={collectionJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
          items: SLEEP_POSITIONS.map((p) => ({ href: p.href, title: positionPageTitle(p.slug) })),
        })}
      />
    </>
  );
}
