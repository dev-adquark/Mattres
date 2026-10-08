import { clampMeta } from '@/lib/content/seo';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog, getMattressById } from '@/lib/db/mattressRepo';
import { getVerificationLevel } from '@/lib/dataIntegrity';
import { displayTitle } from '@/lib/format';
import { SLEEP_POSITIONS } from '@/lib/site';
import { GUIDES } from '@/lib/content/guides';
import { ctaFor } from '@/lib/outbound';
import type { Guide, MattressEntry } from '@/lib/types';
import { JsonLd } from '@/components/ui/JsonLd';
import { ComparedWith } from '@/components/compare-page/ComparedWith';
import { MattressViewed } from '@/components/product/ProductPersonal';
import { ProductStoryProvider } from '@/components/product/ProductStory';
import { ProductHero } from '@/components/product/ProductHero';
import { ProductScoreSection } from '@/components/product/ProductScoreSection';
import { ProductInspectSection } from '@/components/product/ProductInspectSection';
import { ProductSpecs } from '@/components/product/ProductSpecs';
import { ProductReviews } from '@/components/product/ProductReviews';
import { RtingsEvidence } from '@/components/product/RtingsEvidence';
import { catalogRtingsCrossCheck, getPublishedEvidence } from '@/lib/rtings/evidence';
import { ProductRelated } from '@/components/product/ProductRelated';
import { getReferenceScores, referenceRowsFor } from '@/components/product/referenceScores';
import { bestPosition, publicNote, scoreLineFor, standoutRatings } from '@/components/product/productDisplay';
import { relevantGuides, similarFromOtherBrands } from '@/components/product/productData';
import { describeMattress, independentEvidenceFor, productJsonLd, productPath } from '@/components/product/productPageModel';

// Fresh within the hour after a catalog change, without a redeploy.
// Only ids in the catalog at build time get a page: anything else is a real
// HTTP 404 (the root loading.js would otherwise stream a 200 soft-404). A
// mattress added later appears after the next build.
export const revalidate = 3600;
export const dynamicParams = false;

interface MattressPageProps {
  params: Promise<{ id: string }>;
}

// lib/db/mattressRepo is CommonJS shared with the root Node scripts; its
// results are catalog records (lib/types MattressEntry).
async function loadEntry(id: string): Promise<MattressEntry | null> {
  return (await getMattressById(id)) as MattressEntry | null;
}

async function loadCatalog(): Promise<MattressEntry[]> {
  const { entries } = (await getCatalog()) as { entries: MattressEntry[] };
  return entries;
}

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const entries = await loadCatalog();
  return entries.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: MattressPageProps): Promise<Metadata> {
  const { id } = await params;
  const entry = await loadEntry(id);
  if (!entry) return { title: 'Mattress not found', robots: { index: false, follow: true } };
  const name = displayTitle(entry);
  const description = clampMeta(describeMattress(entry, independentEvidenceFor(entry, await getPublishedEvidence(entry.id))));
  const path = productPath(entry);
  return {
    // The layout template appends " · Mattress Match Score"; a long model name would push the title past ~60 characters.
    title: name.length > 36 ? { absolute: name } : name,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', title: `${name} · Mattress Match Score`, description, url: path },
    twitter: { card: 'summary_large_image', title: `${name} · Mattress Match Score`, description },
  };
}

const positionHref = (position: string): string | null => SLEEP_POSITIONS.find((s) => s.slug === position)?.href || null;

export default async function MattressDetailPage({ params }: MattressPageProps) {
  const { id } = await params;
  const entry = await loadEntry(id);
  if (!entry) notFound();

  // RTINGS evidence comes from the repository through a tagged cache, never
  // from Apify at request time; the catalog cross-check is the fallback.
  const [entries, reference, rtingsEvidence] = await Promise.all([loadCatalog(), getReferenceScores(), getPublishedEvidence(entry.id)]);
  const name: string = displayTitle(entry);
  const cta = ctaFor(entry);
  const rows = referenceRowsFor(reference, entry.id, positionHref);
  const best = bestPosition(rows);
  const guides = relevantGuides(entry, GUIDES as readonly Guide[]);

  return (
    <ProductStoryProvider mattressId={entry.id} mattressName={name} rows={rows} defaultPosition={best ? best.id : 'side'} modelVersion={reference.modelVersion}>
      <ProductHero entry={entry} name={name} cta={cta} scoreLine={scoreLineFor(rows)} standouts={standoutRatings(entry)} />
      {/*
        Below-the-fold chapters sit in their own <Suspense> boundaries. Nothing
        in them suspends (the HTML is complete on first paint); the boundaries
        let React hydrate each chapter later, in small interruptible slices,
        instead of in the hero's single hydration task. That keeps mobile
        main-thread blocking low. ProductStoryProvider keeps its context value
        stable across hydration so these boundaries are not force-hydrated.
      */}
      <Suspense fallback={null}>
        <ProductScoreSection mattressId={entry.id} name={name} modelVersion={reference.modelVersion} />
      </Suspense>
      <Suspense fallback={null}>
        <ProductInspectSection entry={entry} name={name} />
      </Suspense>
      <Suspense fallback={null}>
        <ProductSpecs entry={entry} />
        <RtingsEvidence name={name} evidence={rtingsEvidence} crossCheck={rtingsEvidence ? null : catalogRtingsCrossCheck(entry)} />
        <ProductReviews entry={entry} />
      </Suspense>
      <Suspense fallback={null}>
        <ProductRelated
          entry={entry}
          name={name}
          similar={similarFromOtherBrands(entry, entries, 6)}
          sameBrand={entries.filter((e) => e.brand === entry.brand && e.id !== entry.id)}
          guides={guides}
        />
        <ComparedWith id={entry.id} />
      </Suspense>

      <JsonLd data={productJsonLd(entry, cta, publicNote(entry.priceNote), independentEvidenceFor(entry, rtingsEvidence))} id={`product-${entry.id}`} />
      <MattressViewed mattressId={entry.id} brand={entry.brand} type={entry.type} verificationLevel={getVerificationLevel(entry)} />
    </ProductStoryProvider>
  );
}
