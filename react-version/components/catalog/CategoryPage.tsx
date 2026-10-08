import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getGuide } from '@/lib/content/guides';
import type { Guide, VsPage } from '@/lib/types';
import { MattressRender } from '@/components/ui/MattressRender';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { CategoryIndex } from './CategoryIndex';
import { CategoryViewTracker, CompareTopThree } from './CategoryClient';
import { PodiumModule } from './CategoryRankRows';
import { CategoryRankingSection } from './CategoryRankingSection';
import { CategorySecondary } from './CategorySecondary';
import type { CategoryView } from './buildCategory';
import { RANKING_RULE_TEXT } from '@/lib/categories';
import styles from './CategoryPage.module.css';

/** A head-to-head comparison whose both sides are on the page. */
export type CategoryPair = Pick<VsPage, 'slug' | 'title'> & { href?: string };

interface CategoryPageProps {
  /** components/catalog/buildCategory */
  view: CategoryView;
  /** categoryCounts(): slug -> live count */
  counts: Readonly<Record<string, number>>;
  pairs?: readonly CategoryPair[];
}

/**
 * /mattresses/<category>: a typography-led hero with the live count and the
 * No. 1 pick, a disclosure strip stating exactly who the list is ranked
 * for, the top three as large editorial modules (engine headline, two
 * reasons, one watch-out), then the full ranking as a dense list, the
 * unranked entries (not enough independent data) alphabetically, and
 * related guides, comparisons and categories.
 */
export function CategoryPage({ view, counts, pairs = [] }: CategoryPageProps) {
  const { editorial: ed, podium } = view;
  const lead = podium[0];
  const [plain, emphasis] = ed.title;
  const isRating = view.method === 'rating';
  const quizHref = `/find-match?from=${view.slug}`;

  return (
    <>
      <CategoryViewTracker category={view.slug} count={view.shown} />

      {/* 1 - Hero ------------------------------------------------------ */}
      <section className={cx('section--linen', styles.hero)} aria-labelledby="category-title" data-nav-theme="light">
        <div className={cx('container container--wide', styles.heroGrid)}>
          <div className={styles.heroHead}>
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Mattresses', href: '/mattresses' },
                { label: view.category.chip, href: view.href },
              ]}
            />
            <p className={styles.kicker}>
              <span className={styles.kickerRule} aria-hidden="true" />
              {ed.eyebrow}
            </p>
            <h1 id="category-title" className={styles.title}>
              {plain} <em>{emphasis}</em>
            </h1>
          </div>

          {lead ? (
            <figure className={styles.heroVisual}>
              <Link href={`/mattress/${encodeURIComponent(lead.id)}`} className={styles.heroFrame} aria-label={`No. 1: ${lead.title}`}>
                <MattressRender type={lead.entry.type} seed={lead.id} aspect="product" fill objectPosition="55% 60%" preload photo={lead.entry.photo} photoCreditLink={false} sizes="(min-width: 900px) 42vw, 100vw" />
                {lead.entry.photo ? null : <span className={cx('illus-tag', styles.heroTag)}>Illustration</span>}
              </Link>
              <figcaption className={styles.heroCaption}>
                <span className={styles.heroCaptionRank}>No. 1</span>
                <span className={styles.heroCaptionName}>{lead.title}</span>
                <span className={styles.heroCaptionScore}>
                  <span className="tabular">{lead.metric.display}</span>
                  <span className="sr-only"> {lead.metric.label}</span>
                </span>
              </figcaption>
            </figure>
          ) : null}

          <div className={styles.heroBody}>
            <p className={styles.lead}>{ed.intro}</p>
            <p className={styles.count}>
              <span className={styles.countNumber}>{view.shown}</span>
              <span className={styles.countText}>
                mattresses on this page
                <br />
                {view.rankedCount} ranked{view.modelVersion ? ` · scoring model v${view.modelVersion}` : ''}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* 2 - Disclosure strip ------------------------------------------- */}
      <section className={cx('section--sand', styles.disclosure)} aria-label="How this list is ranked">
        <div className={cx('container container--wide', styles.disclosureGrid)}>
          <div className={styles.disclosureRule}>
            <p className={styles.disclosureLabel}>{isRating ? 'Ranked by' : 'Ranked for'}</p>
            <p className={styles.disclosureProfile}>{view.profileText}</p>
          </div>
          <div className={styles.disclosureRule}>
            <p className={styles.disclosureLabel}>Ranking rule</p>
            <p className={styles.disclosureText}>
              {/* A rating-ranked page states its own entry cutoff in ed.rule. */}
              {ed.rule} {isRating ? null : <>{RANKING_RULE_TEXT} </>}
              Sponsorship never changes a score.{' '}
              <Link href="/methodology" className="link">
                Methodology
              </Link>
            </p>
          </div>
          <div className={styles.disclosureCta}>
            <Link href={quizHref} className={styles.disclosureLink}>
              Rank these for your own body
              <ArrowRight aria-hidden="true" />
            </Link>
            {ed.positionGuide ? (
              <Link href={ed.positionGuide.href} className={styles.disclosureSecondary}>
                {ed.positionGuide.label}
              </Link>
            ) : null}
          </div>
        </div>
        {ed.note ? (
          <div className="container container--wide">
            <p className={styles.note}>{ed.note}</p>
          </div>
        ) : null}
      </section>

      {/* 3 - Podium ----------------------------------------------------- */}
      {podium.length ? (
        <section className={cx('section--editorial', styles.podiumSection)} aria-labelledby="podium-title">
          <div className="container container--wide">
            <div className={styles.sectionHead}>
              <h2 id="podium-title" className={styles.sectionTitle}>
                {ed.split ? 'The top three, across both groups' : 'The top three'}
              </h2>
              <CompareTopThree ids={podium.map((r) => r.id)} category={view.slug} className={styles.compareTop} />
            </div>
            <ol className={styles.podium}>
              {podium.map((row, i) => (
                <li key={row.id} className={cx(styles.podiumItem, i === 0 && styles.podiumFirst)}>
                  <PodiumModule row={row} first={i === 0} isRating={isRating} />
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* 4 - Full ranking ----------------------------------------------- */}
      <CategoryRankingSection view={view} />

      {/* 5 - Secondary --------------------------------------------------- */}
      <CategorySecondary secondary={view.secondary} />

      {/* 6 - Related ----------------------------------------------------- */}
      <CategoryRelated view={view} counts={counts} pairs={pairs} />

      {/* 7 - Close ------------------------------------------------------- */}
      <section className={cx('section--cinematic', styles.close)} data-nav-theme="dark">
        <div className={cx('container container--wide', styles.closeGrid)}>
          <h2 className={styles.closeTitle}>
            Ranked for a reference sleeper. <em>Now rank them for you.</em>
          </h2>
          <div className={styles.closeBody}>
            <p className={styles.closeText}>
              A few questions about how you sleep. The same engine re-scores all {view.total} mattresses for your body and explains every number.
            </p>
            <Button href={quizHref} size="lg" arrow>
              Find My Match
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

interface RelatedLink {
  key: string;
  href: string;
  kicker: string;
  title: string;
}

function CategoryRelated({ view, counts, pairs }: Required<CategoryPageProps>) {
  const ed = view.editorial;
  const guides = ed.guides.map((slug): Guide | null => getGuide(slug) ?? null).filter((g): g is Guide => g !== null);
  const links: RelatedLink[] = [
    ...(ed.positionGuide ? [{ key: ed.positionGuide.href, href: ed.positionGuide.href, kicker: 'Sleep position guide', title: ed.positionGuide.label }] : []),
    ...guides.map((g) => ({ key: g.slug, href: `/guides/${g.slug}`, kicker: 'Guide', title: g.title })),
    ...pairs.map((p) => ({ key: p.slug, href: p.href || `/compare/${p.slug}`, kicker: 'Head to head', title: p.title })),
  ];

  return (
    <section className={cx('section--editorial', styles.related)} aria-labelledby="related-title">
      <div className={cx('container container--wide', styles.relatedGrid)}>
        <div>
          <h2 id="related-title" className={styles.sectionTitle}>
            Read before <em>you choose.</em>
          </h2>
          <ul className={styles.guides}>
            {links.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className={styles.guide}>
                  <span className={styles.guideKicker}>{l.kicker}</span>
                  <span className={styles.guideTitle}>{l.title}</span>
                  <ArrowRight aria-hidden="true" className={styles.guideArrow} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={styles.relatedSub}>Related rankings</h2>
          <CategoryIndex counts={counts} only={ed.related} variant="chips" label="Related rankings" />
          <h2 className={styles.relatedSub}>Everything else</h2>
          <p className={styles.relatedText}>
            <Link href="/mattresses" className="link">
              Search and filter all {view.total} mattresses
            </Link>{' '}
            by type, firmness, price, materials and independent ratings.
          </p>
        </div>
      </div>
    </section>
  );
}
