import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import { compareTopics } from '@/lib/compareTopics';
import { COMPARE_PAIRS } from '@/lib/comparePairs';
import type { VsPage } from '@/lib/types';
import { parseIdsParam } from '@/components/compare-page/compareModel';
import { loadCatalog } from '@/components/compare-page/engine';
import { CompareWorkspace } from '@/components/compare-page/CompareWorkspace';
import { CompareEmpty } from '@/components/compare-page/CompareEmpty';
import { ComparePopular } from '@/components/compare-page/ComparePopular';
import { CompareAnnouncer } from '@/components/compare-page/CompareAnnouncer';

const DESCRIPTION =
  'Put up to three mattresses side by side: Match Scores for your sleep profile, the six scored dimensions, firmness, price, trial, warranty and data status, with the differences marked.';

interface ComparePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const { ids } = await searchParams;
  const hasSelection = parseIdsParam(ids).length > 0;
  return {
    title: 'Compare mattresses',
    description: DESCRIPTION,
    alternates: { canonical: '/compare' },
    openGraph: { title: 'Compare mattresses', description: DESCRIPTION, url: '/compare', type: 'website', images: [SHARE_IMAGE] },
    // A personal selection is not a page for search engines; the bare page is.
    robots: hasSelection ? { index: false, follow: true } : undefined,
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { ids: rawIds } = await searchParams;
  const ids = parseIdsParam(rawIds);
  const catalog = await loadCatalog();
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const entries = ids.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
  const missingCount = ids.length - entries.length;

  // "Start here" is a cross-brand question (the slider opens on a same-brand
  // upgrade), and it is left out of the slider below so no pair shows twice.
  const available = (COMPARE_PAIRS as readonly VsPage[]).flatMap((pair) => {
    const a = byId.get(pair.a);
    const b = byId.get(pair.b);
    return a && b ? [{ pair, a, b }] : [];
  });
  const featured = available.find((p) => p.a.brand !== p.b.brand) ?? available[0] ?? null;
  const topics = Object.entries(compareTopics).map(([slug, t]) => ({ slug, title: t.title, chips: t.chips, intro: t.intro }));

  return (
    <>
      <CompareAnnouncer />
      {entries.length ? <CompareWorkspace entries={entries} missingCount={missingCount} /> : <CompareEmpty urlIds={ids} featured={featured} />}
      <ComparePopular catalog={catalog} topics={topics} exclude={entries.length ? undefined : featured?.pair.slug} />
    </>
  );
}
