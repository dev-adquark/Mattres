import { clampMeta } from '@/lib/content/seo';
import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import { notFound } from 'next/navigation';
import { displayTitle } from '@/lib/format';
import { COMPARE_PAIRS } from '@/lib/compareTopics';
import { GUIDES } from '@/lib/content/guides';
import { JsonLd } from '@/components/ui/JsonLd';
import { mattressHref } from '@/components/product/productData';
import { REFERENCE_POSITIONS, getReferenceScores } from '@/components/product/referenceScores';
import { BrandHero } from '@/components/brands/BrandHero';
import { BrandScores } from '@/components/brands/BrandScores';
import { BrandVerdict } from '@/components/brands/BrandVerdict';
import { BrandSpecs } from '@/components/brands/BrandSpecs';
import { BrandCompare } from '@/components/brands/BrandCompare';
import { BrandNext } from '@/components/brands/BrandNext';
import { brandGroups, loadBrand, loadCatalogEntries } from '@/components/brands/brandCatalog';
import {
  BRAND_RATING_DIMS,
  lineupFacts,
  brandSentence,
  brandVerdicts,
  categoriesForBrand,
  commerceSummary,
  compareHref,
  dominantType,
  guidesForLineup,
  lineupByReference,
  nearestPairs,
  pairsForBrand,
  referenceMatrix,
  referenceStandings,
  rivalsFor,
  typeMix,
} from '@/components/brands/brandData';

/** Route props for /brands/[brand] (Next 16 passes params as a Promise). */
interface BrandPageProps {
  params: Promise<{ brand: string }>;
}

export const revalidate = 3600;
// Only brands that exist in the catalog get a page.
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ brand: string }[]> {
  return brandGroups(await loadCatalogEntries()).map((g) => ({ brand: g.slug }));
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brand } = await params;
  const data = await loadBrand(brand);
  if (!data) return { title: 'Brand not found', robots: { index: false } };
  const { group } = data;
  const description = clampMeta(`${brandSentence(group.name, lineupFacts(group.entries))} See its specs, sources and Match Scores by sleeping position.`);
  const path = `/brands/${group.slug}`;
  return {
    title: `${group.name} mattresses`,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${group.name} mattresses · Mattress Match Score`, description, url: path, type: 'website', images: [SHARE_IMAGE] },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brand } = await params;
  const data = await loadBrand(brand);
  if (!data) notFound();
  const { group, entries } = data;
  const { name } = group;
  const facts = lineupFacts(group.entries);
  const single = group.entries.length === 1;
  const path = `/brands/${group.slug}`;

  const { byPosition } = await getReferenceScores(REFERENCE_POSITIONS.map((p) => p.id));
  const standings = referenceStandings(group.entries, byPosition);
  const ordered = lineupByReference(group.entries, byPosition);
  const lead = ordered[0];
  if (!lead) notFound();
  const lineupIds = ordered.slice(0, 3).map((e) => e.id);
  const singleTitle = single ? displayTitle(lead) : null;
  const pairs = pairsForBrand(group.entries, COMPARE_PAIRS).slice(0, 3);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${name} mattresses`,
    numberOfItems: ordered.length,
    itemListElement: ordered.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: displayTitle(e), url: mattressHref(e) })),
  };

  return (
    <>
      <JsonLd id="brand-itemlist" data={itemList} />
      <BrandHero name={name} path={path} sentence={brandSentence(name, facts)} mix={typeMix(facts)} ordered={ordered} compareHref={single ? null : compareHref(lineupIds)} categories={categoriesForBrand(group.entries, entries)} />
      <BrandScores
        name={name}
        subject={singleTitle ?? `the ${name} lineup`}
        single={single}
        domType={dominantType(group.entries)}
        standings={standings}
        matrix={referenceMatrix(ordered, byPosition)}
      />
      <BrandVerdict
        name={name}
        verdicts={brandVerdicts(name, group.entries, entries, byPosition)}
        hasRatings={BRAND_RATING_DIMS.some((d) => group.entries.some((e) => typeof e[d.field] === 'number'))}
        rankedCount={standings[0]?.total ?? null}
      />
      {!single ? <BrandSpecs name={name} entries={ordered} /> : null}
      <BrandCompare
        name={name}
        path={path}
        ordered={ordered}
        lineupIds={lineupIds}
        pairs={pairs}
        nearest={pairs.length ? [] : nearestPairs(lead, entries, COMPARE_PAIRS, 1)}
        rivals={rivalsFor(lead, entries, single ? 3 : 2)}
        commerce={commerceSummary(ordered)}
      />
      <BrandNext name={name} singleTitle={singleTitle} guides={guidesForLineup(ordered, GUIDES, 3)} />
    </>
  );
}
