import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '@/components/ui/JsonLd';
import { compareTopics, getCompareTopic, profileFilters, MIN_TOPIC_CANDIDATES, TOPIC_COMPARE_COUNT } from '@/lib/compareTopics';
import { COMPARE_PAIRS, getPair, getReversedPair } from '@/lib/comparePairs';
import { getGuide } from '@/lib/content/guides';
import { absoluteUrl, SHARE_IMAGE, pageTitle } from '@/lib/site';
import type { Guide, VsPage } from '@/lib/types';
import { compareVerdict, columnName, slimItem } from '@/components/compare-page/compareModel';
import { loadCatalog, rankForProfile } from '@/components/compare-page/engine';
import { buildPairData } from '@/components/compare-page/pairModel';
import { PairPage } from '@/components/compare-page/PairPage';
import { ComparisonTable } from '@/components/compare-page/ComparisonTable';
import { Lineup } from '@/components/compare-page/Lineup';
import { Verdict } from '@/components/compare-page/Verdict';
import { TopicHero } from '@/components/compare-page/TopicHero';
import { TopicCriteria } from '@/components/compare-page/TopicCriteria';
import { TopicRanking } from '@/components/compare-page/TopicRanking';
import { TopicNext } from '@/components/compare-page/TopicNext';
import { TrackComparison } from '@/components/compare-page/TrackComparison';
import type { CompareColumn } from '@/components/compare-page/types';
import styles from '@/components/compare-page/Compare.module.css';

// Rankings come from the live catalog; refresh hourly so a catalog change shows up without a redeploy.
export const revalidate = 3600;
// Profile topics and head-to-head pairs are all prerendered, so any other slug
// is a real 404 status (with dynamicParams=true the root loading.tsx boundary
// starts streaming a 200 before notFound() runs: a soft 404). Reversed pair
// slugs ("b-vs-a") never reach this page: next.config redirects() sends them
// to the canonical page with a 308.
export const dynamicParams = false;

const RANKING_LIMIT = 10;


interface CompareTopicPageProps {
  params: Promise<{ topic: string }>;
}

export function generateStaticParams(): { topic: string }[] {
  return [...Object.keys(compareTopics), ...COMPARE_PAIRS.map((p) => p.slug)].map((topic) => ({ topic }));
}

function pairMetadata(pair: VsPage): Metadata {
  const title = pair.title;
  const description = `${pair.short} Match Scores for four reference sleepers, the six scored dimensions, independent ratings, specs and published prices, side by side.`;
  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: pair.href },
    openGraph: { title, description, url: pair.href, type: 'article', images: [SHARE_IMAGE] },
  };
}

export async function generateMetadata({ params }: CompareTopicPageProps): Promise<Metadata> {
  const { topic } = await params;
  const pair = getPair(topic);
  if (pair) return pairMetadata(pair);
  const config = getCompareTopic(topic);
  if (!config) return { title: 'Comparison not found', robots: { index: false, follow: true } };
  const path = `/compare/${topic}`;
  return {
    title: pageTitle(config.metaTitle),
    description: config.description,
    alternates: { canonical: path },
    openGraph: { title: config.metaTitle, description: config.description, url: path, type: 'article', images: [SHARE_IMAGE] },
  };
}

export default async function CompareTopicPage({ params }: CompareTopicPageProps) {
  const { topic } = await params;
  const pair = getPair(topic);
  if (pair) {
    const data = await buildPairData(pair);
    if (!data) notFound(); // one of the two left the catalog (the registry test also guards this)
    const catalog = await loadCatalog();
    return <PairPage pair={pair} data={data} catalog={catalog} />;
  }
  const reversed = getReversedPair(topic);
  if (reversed) permanentRedirect(reversed.href);

  const config = getCompareTopic(topic);
  if (!config) notFound();

  const { results, modelVersion } = await rankForProfile(config.profile);
  // A topic with fewer than two real candidates is not a comparison (also enforced by lib/compareTopics.test.ts).
  const leader = results[0];
  if (results.length < MIN_TOPIC_CANDIDATES || !leader) notFound();

  const top = results.slice(0, TOPIC_COMPARE_COUNT);
  const columns: CompareColumn[] = top.map((item) => ({ id: item.entry.id, entry: item.entry, item: slimItem(item) }));
  const verdict = compareVerdict(columns);
  const ranking = results.slice(0, RANKING_LIMIT);
  const factors = (leader.explanation && leader.explanation.profileFactors) || [];
  const guides = (config.guides || []).map((slug) => getGuide(slug)).filter((g): g is Guide => Boolean(g));
  const otherTopics = Object.entries(compareTopics)
    .filter(([slug]) => slug !== topic)
    .map(([slug, t]) => ({ slug, title: t.title, chips: t.chips }));
  const path = `/compare/${topic}`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: config.h1,
    description: config.description,
    numberOfItems: ranking.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: ranking.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: columnName(r.entry),
      url: absoluteUrl(`/mattress/${r.entry.id}`),
    })),
  };

  return (
    <>
      <TopicHero topic={config} path={path} resultCount={results.length} comparedCount={top.length} modelVersion={modelVersion} />

      <section className={`section section--tight section--product ${styles.lineupSection}`} aria-labelledby="top-title">
        <div className="container container--wide">
          <div className={styles.lineupHead}>
            <h2 id="top-title" className="h3">
              The top {top.length} for this profile
            </h2>
          </div>
          <Lineup columns={columns} scoring="ready" ranked />
          <p className="media-caption">Illustrations of typical construction for each mattress type, not product photos.</p>
        </div>
      </section>

      <section className="section section--linen" aria-labelledby="table-title">
        <div className="container container--wide">
          <header className={styles.tableHead}>
            <p className="eyebrow">Side by side</p>
            <h2 id="table-title" className="h2">
              Where they differ.
            </h2>
            <p className={styles.tableIntro}>Scores are for the demo profile above. Add any of them to your own comparison to score it for the way you sleep.</p>
          </header>
          <ComparisonTable columns={columns} profile={config.profile} caption={`${config.h1}: top ${top.length} compared`} toggleSource="topic" scoring="ready" />
        </div>
      </section>

      <section className={`section section--cinematic ${styles.verdictSection}`} aria-labelledby="verdict-title">
        <div className="container container--wide">
          <Verdict columns={columns} verdict={verdict} audience="demo" headingId="verdict-title" />
        </div>
      </section>

      <TopicCriteria why={config.why} factors={factors} filters={profileFilters(config.profile)} />
      <TopicRanking ranking={ranking} total={results.length} />
      <TopicNext guides={guides} otherTopics={otherTopics} />

      <JsonLd data={itemList} id={`itemlist-${topic}`} />
      <TrackComparison count={columns.length} source="topic" topic={topic} />
    </>
  );
}
