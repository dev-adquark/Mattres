import { JsonLd } from '@/components/ui/JsonLd';
import { FaqAccordion } from '@/components/FaqAccordion';
import { ScrollProgress } from '@/components/motion';
import { cx } from '@/components/ui/cx';
import { GUIDES, guideCategoryLabel } from '@/lib/content/guides';
import { getCategoryPage } from '@/lib/categoryPages';
import { getRepresentativeProfile } from '@/lib/content/profiles';
import { relatedForGuide } from '@/lib/content/links';
import { articleJsonLd, faqPageJsonLd } from '@/lib/content/seo';
import type { ArticleModule, LinkItem, ScoringRules } from '@/lib/content/types';
import type { Guide, MattressEntry } from '@/lib/types';
import { GuideViewTracker } from './GuideViewTracker';
import { GuideHero } from './GuideHero';
import { GuideArticle } from './GuideArticle';
import { GuideCarousel } from './GuideCarousel';
import { RankedMattresses } from './RankedMattresses';
import { RelatedStrip } from './RelatedLinks';
import { ContentCta } from './ContentCta';
import styles from './Content.module.css';

interface GuideLayoutProps {
  /** lib/content/guides.ts registry entry. */
  guide: Guide;
  /** The guide's article module (components/content/articles). */
  article: ArticleModule;
  rules: ScoringRules;
  /** Live catalog entries. */
  catalog: MattressEntry[];
}

/**
 * Editorial guide template.
 *
 * Order: hero (breadcrumb, category, H1, standfirst, byline, visual) ->
 * article with sticky/collapsible TOC, key takeaways, body, sources ->
 * engine-ranked mattresses for a disclosed profile -> FAQ -> related -> CTA.
 */
export function GuideLayout({ guide, article, rules, catalog }: GuideLayoutProps) {
  const categoryLabel = guideCategoryLabel(guide.category);
  const profile = getRepresentativeProfile(guide.profileKey);
  const related = relatedForGuide(guide.slug);
  const categoryLinks: LinkItem[] = [];
  for (const slug of guide.categoryPages ?? []) {
    const page = getCategoryPage(slug);
    if (page && categoryLinks.length < 3) categoryLinks.push({ href: page.href, label: page.title });
  }
  // Related guides first, then the rest of the library in registry order.
  const carouselGuides = [...related.guides, ...GUIDES.filter((g) => g.slug !== guide.slug && !related.guides.some((r) => r.slug === g.slug))];

  return (
    <>
      <ScrollProgress targetId="guide-article" />
      <GuideHero guide={guide} rules={rules} catalog={catalog} />
      <GuideArticle article={article} ctx={{ rules, catalog }} />

      {profile ? (
        <section className="section section--product" aria-labelledby="ranked-title">
          <div className="container container--wide">
            <RankedMattresses
              profile={profile}
              headingId="ranked-title"
              title={article.ranking?.title || 'Where to start looking'}
              intro={article.ranking?.intro}
              moreLinks={categoryLinks}
            />
          </div>
        </section>
      ) : null}

      {article.faqs && article.faqs.length ? (
        <section className="section section--editorial section--linen" aria-labelledby="faq-title">
          <div className={cx('container container--wide', styles.faqGrid)}>
            <div>
              <p className="eyebrow">FAQ</p>
              <h2 id="faq-title" className="h2">
                Questions readers ask
              </h2>
            </div>
            <FaqAccordion items={article.faqs} headingLevel="h3" />
          </div>
        </section>
      ) : null}

      <section className={cx('section section--editorial', styles.relatedSection)} aria-labelledby="related-title">
        <div className="container container--wide">
          <GuideCarousel
            id="guides-related"
            label="Keep reading: related sleep guides"
            guides={carouselGuides}
            catalog={catalog}
            header={
              <h2 id="related-title" className={cx('h2', styles.relatedTitle)}>
                Keep reading
              </h2>
            }
          />
          <RelatedStrip positions={related.positions} comparisons={related.comparisons} categories={categoryLinks} />
        </div>
      </section>

      <ContentCta
        id="guide-cta"
        title={article.cta?.title || 'Your answers move every number in this guide.'}
        body={
          article.cta?.body ||
          'Tell us how you sleep and the same engine ranks the full catalog for you, with the reasons and the watch-outs.'
        }
        secondary={{ href: '/guides', label: 'All sleep guides' }}
      />

      <GuideViewTracker slug={guide.slug} category={guide.category} />
      <JsonLd
        data={articleJsonLd({
          title: guide.title,
          description: guide.description,
          path: guide.path,
          published: guide.published,
          updated: guide.updated,
          section: categoryLabel,
        })}
      />
      <JsonLd data={faqPageJsonLd(article.faqs)} />
    </>
  );
}
