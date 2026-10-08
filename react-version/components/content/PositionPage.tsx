import Link from 'next/link';
import { DIMENSION_BY_ID } from '@/lib/explain';
import { SLEEP_POSITIONS, absoluteUrl } from '@/lib/site';
import { POSITION_PUBLISHED, POSITION_UPDATED } from '@/lib/content/positions';
import { formatEditorialDate } from '@/lib/content/guides';
import { getRepresentativeProfile, findMatchHref, profileChips } from '@/lib/content/profiles';
import { rankingForPosition, relatedForPosition } from '@/lib/content/links';
import { faqPageJsonLd } from '@/lib/content/seo';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/ui/JsonLd';
import { FaqAccordion } from '@/components/FaqAccordion';
import { weightBandFor } from '@/lib/content/bands';
import type { PositionContent, ScoringRules } from '@/lib/content/types';
import { RangeChart, bandRowsForPosition } from './RangeChart';
import { WeightPanel } from './WeightPanel';
import { RankedMattresses } from './RankedMattresses';
import { RelatedLinks } from './RelatedLinks';
import { ContentCta } from './ContentCta';
import { GuideViewTracker } from './GuideViewTracker';
import { cx } from '@/components/ui/cx';
import styles from './Position.module.css';

interface PositionPageProps {
  content: PositionContent;
  rules: ScoringRules;
}

/**
 * /sleep-position/[position]: what the position means for a mattress, the
 * comfort window and dimension weights straight from the rules and engine,
 * an engine-ranked shortlist for a disclosed example profile, FAQ and links.
 */
export function PositionPage({ content, rules }: PositionPageProps) {
  const profile = getRepresentativeProfile(content.profileKey);
  if (!profile) throw new Error(`No representative profile "${content.profileKey}" for ${content.slug}`);
  const band = weightBandFor(rules, profile.weightLb);
  const related = relatedForPosition(content.slug);
  const otherPositions = SLEEP_POSITIONS.filter((p) => p.slug !== content.slug);
  const path = `/sleep-position/${content.slug}`;
  const firstGuide = related.guides[0];
  const ranking = rankingForPosition(content.slug);
  const [pre, em, post] = content.headline;

  return (
    <>
      <section className={cx('section section--cinematic', styles.hero)} data-nav-theme="dark" aria-labelledby="position-title">
        <div className="container container--wide">
          <Breadcrumbs
            className={styles.crumbs}
            items={[
              { label: 'Home', href: '/' },
              { label: 'Sleep positions', href: '/sleep-position' },
              { label: content.label, href: path },
            ]}
          />
          <div className={styles.heroGrid}>
            <div className={styles.heroText}>
              <p className="eyebrow">Sleep position</p>
              <h1 id="position-title" className={cx('display-l', styles.heroTitle)}>
                {pre} <em>{em}</em> {post}
              </h1>
              <p className={cx('lead', styles.heroLead)}>{content.lead}</p>
              <div className="cluster">
                <Button href={findMatchHref(content.slug)} variant="primary" size="lg" arrow magnetic>
                  Find My Match
                </Button>
                {firstGuide ? (
                  <Button href={firstGuide.path} variant="ghost" size="lg">
                    Read: {firstGuide.title}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={styles.heroChart}>
              <RangeChart
                caption={`${content.label}: comfort window by body weight`}
                rowHeader="Body weight"
                rows={bandRowsForPosition(rules, content.slug, band).map((r) =>
                  r.highlight ? { ...r, sub: 'Example profile on this page' } : r,
                )}
              />
              <p className={styles.heroChartNote}>
                Firmness on a 1–10 scale, from scoring rules v{rules.version}. Updated{' '}
                <time dateTime={POSITION_UPDATED}>{formatEditorialDate(POSITION_UPDATED)}</time>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--editorial" aria-labelledby="meaning-title">
        <div className={cx('container', styles.splitText)}>
          <h2 id="meaning-title" className={cx('h2', styles.splitTitle)}>
            What {content.noun.replace(' sleeper', ' sleeping')} means for a mattress
          </h2>
          <div className={styles.splitBody}>
            {content.meaning.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
            {content.sources.length ? (
              <p className={styles.sourceNote}>
                Source:{' '}
                {content.sources.map((s, i) => (
                  <span key={s.href}>
                    {i > 0 ? ', ' : null}
                    <a href={s.href} className="link" target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section section--editorial section--linen" aria-labelledby="matters-title">
        <div className="container container--wide">
          <div className={styles.mattersGrid}>
            <div>
              <p className="eyebrow">What matters</p>
              <h2 id="matters-title" className={cx('h2', styles.mattersTitle)}>
                Three things to get right
              </h2>
              <ol className={styles.matters}>
                {content.matters.map((m, i) => (
                  <li key={m.title}>
                    <span className={styles.mattersIndex} aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className={styles.mattersDim}>{DIMENSION_BY_ID[m.dimension]?.label}</p>
                      <h3 className={styles.mattersName}>{m.title}</h3>
                      <p>{m.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <WeightPanel rules={rules} profile={profile} noun={content.noun} />
          </div>
        </div>
      </section>

      <section className="section section--editorial" aria-labelledby="firmness-title">
        <div className={cx('container', styles.splitText)}>
          <h2 id="firmness-title" className={cx('h2', styles.splitTitle)}>
            Firmness considerations
          </h2>
          <div className={styles.splitBody}>
            {content.firmness.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
            <p>
              Read more in{' '}
              <Link href="/guides/how-to-choose-mattress-firmness" className="link">
                how to choose mattress firmness
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="section section--product" aria-labelledby="ranked-title">
        <div className="container container--wide">
          <RankedMattresses
            profile={profile}
            position={content.slug}
            headingId="ranked-title"
            title={`Highest-ranked for a ${content.noun}`}
            intro={`For the example profile below (${profileChips(profile).join(', ').toLowerCase()}), these rank highest in the current catalog.`}
            moreLinks={ranking ? [ranking] : []}
          />
        </div>
      </section>

      <section className="section section--editorial" aria-labelledby="faq-title">
        <div className={cx('container container--wide', styles.faqGrid)}>
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title" className="h2">
              {content.label}: common questions
            </h2>
          </div>
          <FaqAccordion items={content.faqs} headingLevel="h3" />
        </div>
      </section>

      <section className="section section--neutral" aria-labelledby="related-title">
        <div className="container container--wide">
          <RelatedLinks guides={related.guides} positions={otherPositions} comparisons={related.comparisons} title="Keep reading" />
        </div>
      </section>

      <ContentCta
        id="position-cta"
        title="Your weight moves the window. Your answers move the ranking."
        body={`Start the quiz as a ${content.noun} and add your weight, temperature and partner to see your own comfort window and matches.`}
        href={findMatchHref(content.slug)}
        secondary={{ href: '/methodology', label: 'How scoring works' }}
      />

      <GuideViewTracker slug={`position-${content.slug}`} category="sleep-position" kind="position" />
      <JsonLd data={faqPageJsonLd(content.faqs)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: content.title,
          description: content.description,
          url: absoluteUrl(path),
          datePublished: POSITION_PUBLISHED,
          dateModified: POSITION_UPDATED,
          inLanguage: 'en',
        }}
      />
    </>
  );
}
