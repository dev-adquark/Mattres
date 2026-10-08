import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import Link from 'next/link';
import { MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { Section } from '@/components/ui/Section';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/ui/JsonLd';
import { displayTitle } from '@/lib/format';
import { REFERENCE_POSITIONS, getReferenceScores } from '@/components/product/referenceScores';
import { BrandCarousel } from '@/components/brands/BrandCarousel';
import type { BrandCarouselItem } from '@/components/brands/BrandCarousel';
import { BrandIndex } from '@/components/brands/BrandIndex';
import type { BrandIndexRow } from '@/components/brands/BrandIndex';
import { ConstructionLegend } from '@/components/brands/ConstructionBar';
import { brandGroups, loadCatalogEntries } from '@/components/brands/brandCatalog';
import { TYPE_ORDER, brandSnapshot, lineupFacts, dominantType, indexMeta, referenceStandings, typeMix } from '@/components/brands/brandData';
import type { MattressEntry } from '@/lib/types';
import styles from '@/components/brands/Brands.module.css';

const DESCRIPTION =
  'Every mattress brand in the Mattress Match Score catalog: how many models we track, their construction mix, published Queen price ranges and how much of each lineup is verified.';

export const metadata: Metadata = {
  title: 'Mattress brands',
  description: DESCRIPTION,
  alternates: { canonical: '/brands' },
  openGraph: { title: 'Mattress brands · Mattress Match Score', description: DESCRIPTION, url: '/brands', type: 'website', images: [SHARE_IMAGE] },
};

export const revalidate = 3600;

const modelName = (e: MattressEntry): string => e.model || displayTitle(e);

const typeLabelFor = (t: string): string => (MATTRESS_TYPE_LABEL as Partial<Record<string, string>>)[t] || t;

export default async function BrandsPage() {
  const entries = await loadCatalogEntries();
  const rows: BrandIndexRow[] = brandGroups(entries).map((g) => {
    const facts = lineupFacts(g.entries);
    return {
      slug: g.slug,
      name: g.name,
      count: facts.count,
      priceMin: facts.priceMin,
      mix: typeMix(facts),
      meta: indexMeta(facts),
      type: dominantType(g.entries),
      seed: g.entries[0]?.id || g.slug,
    };
  });
  const { byPosition } = await getReferenceScores(REFERENCE_POSITIONS.map((p) => p.id));
  const railItems: BrandCarouselItem[] = brandGroups(entries).map((g) => {
    const facts = lineupFacts(g.entries);
    const { top, bestPlace } = brandSnapshot(referenceStandings(g.entries, byPosition));
    return {
      slug: g.slug,
      name: g.name,
      count: facts.count,
      mix: typeMix(facts),
      type: dominantType(g.entries),
      seed: g.entries[0]?.id || g.slug,
      top: top ? { score: top.score, model: modelName(top.entry), position: top.position } : null,
      place: bestPlace ? { rank: bestPlace.rank, total: bestPlace.total, position: bestPlace.position, model: modelName(bestPlace.entry) } : null,
    };
  });
  const maxCount = Math.max(1, ...railItems.map((r) => r.count));
  const sponsoredCount = entries.filter((e) => e.sponsored === true).length;
  const presentTypes = TYPE_ORDER.filter((t) => entries.some((e) => e.type === t)).map((t) => ({ type: t, label: typeLabelFor(t) }));
  const multi = rows.filter((r) => r.count > 1).length;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Mattress brands',
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `/brands/${r.slug}` })),
  };

  return (
    <>
      <JsonLd id="brands-itemlist" data={itemList} />
      <Section mood="editorial" className={styles.hero} aria-labelledby="brands-title">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Brands', href: '/brands' },
          ]}
        />
        <div className={styles.indexHero}>
          <p className="eyebrow">The brand index</p>
          <h1 id="brands-title" className={styles.indexTitle}>
            {rows.length} brands. <em>No favorites.</em>
          </h1>
          <div className={styles.indexLead}>
            <p className="lead">
              {entries.length} mattresses; {multi} of the brands have more than one model.{' '}
              {sponsoredCount === 0
                ? 'None is a sponsored placement, and'
                : `${sponsoredCount} ${sponsoredCount === 1 ? 'is a labeled sponsored placement' : 'are labeled sponsored placements'}, but`}{' '}
              no brand page changes a Match Score. Every line below comes from the specs on file.
            </p>
            <Button href="/mattresses" variant="secondary" arrow>
              Browse all mattresses
            </Button>
          </div>
        </div>
      </Section>

      <Section mood="product" tight className={styles.rail} aria-labelledby="brand-rail-title">
        <BrandCarousel items={railItems} maxCount={maxCount} />
      </Section>

      <Section mood="editorial" tight className={styles.indexSection} aria-label="All brands">
        <ConstructionLegend types={presentTypes} className={styles.indexLegend} />
        <BrandIndex rows={rows} />
        <p className={styles.indexNote}>
          “Verified” means every required spec is on file and was checked against the manufacturer source.{' '}
          <Link href="/methodology#provenance" className="link">
            How we source and verify data
          </Link>
        </p>
      </Section>

      <Section mood="linen" className={styles.indexClose}>
        <div className={styles.closeGrid}>
          <h2 className={styles.closeTitle}>
            Brand matters less than <em>fit.</em>
          </h2>
          <div className={styles.closeBody}>
            <p className="lead">The quiz scores every mattress here, from all {rows.length} brands, against how you actually sleep.</p>
            <Button href="/find-match" arrow magnetic>
              Find My Match
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
