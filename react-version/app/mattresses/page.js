import Link from 'next/link';
import { getCatalog } from '@/lib/db/mattressRepo';
import MattressThumb from '@/components/MattressThumb';
import BrandLogo from '@/components/BrandLogo';
import { displayTitle } from '@/lib/matchLogic';
import { formatPrice } from '@/lib/format';

export const revalidate = 3600;
export const metadata = {
  title: 'Browse Mattresses — Mattress Match Score',
  description: 'Explore mattress listings by brand and type, review available specifications, and compare options using transparent matching methodology.',
};

export default async function MattressesPage({ searchParams }) {
  const { entries: allEntries } = await getCatalog();
  const params = await searchParams;
  const selectedType = typeof params?.type === 'string' ? params.type.toLowerCase().trim() : '';
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const typeAliases = { 'memory-foam': ['memoryfoam', 'foam'], innerspring: ['innerspring', 'innersprings'], hybrid: ['hybrid'], latex: ['latex'], adjustable: ['adjustable'] };
  const acceptedTypes = typeAliases[selectedType];
  const entries = acceptedTypes ? allEntries.filter((entry) => acceptedTypes.some((type) => normalize(entry.type).includes(type))) : allEntries;
  const brands = [...new Set(entries.map((entry) => entry.brand).filter(Boolean))];
  const types = [...new Set(entries.map((entry) => entry.type).filter(Boolean))];

  return (
    <main className="catalog-page">
      <header className="page-hero">
        <div className="wrap">
          <span className="eyebrow">The mattress collection</span>
          <h1 className="ph-title">Explore the catalog.</h1>
          <p className="ph-sub">Browse {entries.length} mattress listings across {brands.length} brands. Product details may be unverified; check each listing's verification notes.</p>
          <div className="catalog-quick-links">
            <Link href="/find-match" className="btn btn-primary">Find my match →</Link>
            <Link href="/compare" className="btn btn-ghost-dark">Compare mattresses</Link>
          </div>
        </div>
      </header>
      <section className="section">
        <div className="wrap">
          <div className="catalog-meta">{selectedType && <Link href="/mattresses" className="catalog-card-link">Clear type filter ×</Link>}<span>{entries.length} listings</span><span>{types.length} mattress types</span><span>{brands.length} brands</span></div>
          {entries.length ? (
            <div className="catalog-grid">
              {entries.map((entry) => (
                <article className="catalog-card" key={entry.id}>
                  <Link href={`/mattress/${encodeURIComponent(entry.id)}`} className="catalog-card-image" aria-label={`View ${displayTitle(entry)} details`}>
                    <div className="catalog-card-visual-art" aria-hidden="true" />
                    <MattressThumb entry={entry} />
                  </Link>
                  <div className="catalog-card-body">
                    <span className="catalog-card-brand"><BrandLogo brand={entry.brand} size={30} />{entry.brand}</span>
                    <h2><Link href={`/mattress/${encodeURIComponent(entry.id)}`}>{displayTitle(entry)}</Link></h2>
                    <div className="catalog-card-specs">
                      <span>{entry.type || 'Type not listed'}</span>
                      <span>{entry.firmnessRange ? `Firmness ${entry.firmnessRange.min}–${entry.firmnessRange.max}/10` : 'Firmness unknown'}</span>
                    </div>
                    <div className="catalog-card-bottom">
                      <strong>{formatPrice(entry)}</strong>
                      <Link href={`/mattress/${encodeURIComponent(entry.id)}`} className="catalog-card-link">View details <span aria-hidden="true">↗</span></Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="catalog-empty"><h2>Catalog is being updated</h2><p>Try the matching quiz to explore options as the catalog becomes available.</p><Link href="/find-match" className="btn btn-primary">Find my match</Link></div>
          )}
          <p className="catalog-disclaimer">Catalog listings are not endorsements. Specifications and prices are shown as recorded in our catalog; consult each product page for verification status and source notes.</p>
        </div>
      </section>
    </main>
  );
}
