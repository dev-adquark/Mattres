import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import { getCatalog } from '@/lib/db/mattressRepo';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MattressRender } from '@/components/ui/MattressRender';
import { CatalogExplorer } from '@/components/product/CatalogExplorer';
import { groupByBrand } from '@/components/product/productData';
import { catalogSlim } from '@/components/catalog/catalogData';
import { getCatalogReference } from '@/components/catalog/referenceRankings';
import { CategoryIndex } from '@/components/catalog/CategoryIndex';
import { categoryCounts } from '@/lib/categories';
import styles from '@/components/product/CatalogPage.module.css';

const DESCRIPTION =
  'Search, filter and sort every mattress in the Mattress Match Score catalog by type, firmness, Queen price, materials, sleep-position fit and independent ratings, with every missing spec marked honestly.';

export const metadata: Metadata = {
  title: 'Mattresses',
  description: DESCRIPTION,
  // Filtered views (?q=, ?type=, ...) all canonicalise to the base catalog.
  alternates: { canonical: '/mattresses' },
  openGraph: {
    title: 'Mattresses · Mattress Match Score',
    description: DESCRIPTION,
    url: '/mattresses',
    type: 'website',
    images: [SHARE_IMAGE],
  },
};

// Static, refreshed hourly like the category pages: filter state (?q=, ?type=, ...)
// is read from the address bar by the client explorer, so every visit is served
// from cache and the page can use the back/forward cache.
export const revalidate = 3600;

export default async function MattressesPage() {
  // Reference scores power the engine-based sorts; if the engine fails the
  // catalog still renders (those sorts and the fit filter are hidden).
  const [catalog, reference] = await Promise.all([getCatalog(), getCatalogReference().catch(() => null)]);
  const { entries } = catalog;

  const brands: { slug: string; name: string }[] = groupByBrand(entries).map((g) => ({ slug: g.slug, name: g.name }));
  const slim = entries.map(catalogSlim);
  const counts = categoryCounts(entries);

  return (
    <>
      <Section mood="linen" className={styles.hero} containerClassName={styles.heroContainer} aria-labelledby="catalog-title" data-nav-theme="light">
        <div className={styles.heroCopy}>
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Mattresses', href: '/mattresses' }]} />
          <h1 id="catalog-title" className={`h-utility ${styles.title}`}>
            Every mattress, <em>read the same way.</em>
          </h1>
          <p className={styles.lead}>
            {entries.length} mattresses from {brands.length} brands. Specs from each manufacturer, ratings from named independent reviewers, and
            every gap marked as a gap.
          </p>
        </div>

        <figure className={styles.heroVisual}>
          <div className={styles.heroFrame}>
            <MattressRender type="hybrid" aspect="product" colourway="sand" fill objectPosition="58% 60%" preload sizes="(min-width: 900px) 50vw, 100vw" />
            <span className={`illus-tag ${styles.heroTag}`}>Illustration</span>
          </div>
          <figcaption className="sr-only">Rendered illustration of a typical hybrid mattress, not a product photo.</figcaption>
        </figure>

        <div className={styles.heroIndex}>
          <CategoryIndex counts={counts} label="Browse mattresses by category" />
        </div>
      </Section>

      <Section mood="product" id="browse" className={styles.browse} aria-label="Search, filter and compare the catalog">
        <CatalogExplorer entries={slim} brands={brands} reference={reference} categoryCounts={counts} />
      </Section>

      <Section mood="cinematic" className={styles.closing}>
        <div className={styles.closingGrid}>
          <h2 className={`display ${styles.closingTitle}`}>
            A reference sleeper is a start. <em>You are the point.</em>
          </h2>
          <div className={styles.closingBody}>
            <p className="lead">
              Tell the engine your position, weight, temperature and partner. It re-ranks all {entries.length} mattresses for you and explains
              every score.
            </p>
            <div className={styles.actions}>
              <Button href="/find-match?from=catalog" size="lg" arrow>
                Find My Match
              </Button>
              <Button href="/methodology" variant="ghost" size="lg">
                How scoring works
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
