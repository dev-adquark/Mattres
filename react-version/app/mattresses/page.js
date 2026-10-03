import Link from 'next/link';
import { getCatalog } from '@/lib/db/mattressRepo';

import BrandLogo from '@/components/BrandLogo';
import { getVerificationLevel, VERIFICATION_LEVEL_LABEL } from '@/lib/dataIntegrity';
import { displayTitle } from '@/lib/matchLogic';
import { formatPrice } from '@/lib/format';

export const revalidate = 3600;
export const metadata = {
  title: 'Browse Mattresses — Mattress Match Score',
  description: 'Explore mattress listings by brand and type, review available specifications, and compare options using transparent matching methodology.',
};

const TYPE_FILTERS = [
  { key: '', label: 'All types' },
  { key: 'memory-foam', label: 'Memory foam' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'innerspring', label: 'Innerspring' },
  { key: 'latex', label: 'Latex' },
  { key: 'adjustable', label: 'Adjustable' },
];

const SORT_OPTIONS = [
  { key: '', label: 'Featured' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'name', label: 'Name A–Z' },
];

function buildHref(type, sort) {
  const q = new URLSearchParams();
  if (type) q.set('type', type);
  if (sort) q.set('sort', sort);
  const qs = q.toString();
  return qs ? `/mattresses?${qs}` : '/mattresses';
}

export default async function MattressesPage({ searchParams }) {
  const { entries: allEntries } = await getCatalog();
  const params = await searchParams;
  const selectedType = typeof params?.type === 'string' ? params.type.toLowerCase().trim() : '';
  const selectedSort = typeof params?.sort === 'string' ? params.sort.toLowerCase().trim() : '';

  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const typeAliases = { 'memory-foam': ['memoryfoam', 'foam'], innerspring: ['innerspring', 'innersprings'], hybrid: ['hybrid'], latex: ['latex'], adjustable: ['adjustable'] };
  const acceptedTypes = typeAliases[selectedType];
  const filtered = acceptedTypes ? allEntries.filter((entry) => acceptedTypes.some((type) => normalize(entry.type).includes(type))) : allEntries;

  const entries = [...filtered].sort((a, b) => {
    if (selectedSort === 'price-asc') return (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity);
    if (selectedSort === 'price-desc') return (b.priceUsd ?? -Infinity) - (a.priceUsd ?? -Infinity);
    if (selectedSort === 'name') return displayTitle(a).localeCompare(displayTitle(b));
    return 0; // "Featured": the catalog's own stored order, untouched
  });

  const brands = [...new Set(entries.map((entry) => entry.brand).filter(Boolean))];
  const types = [...new Set(entries.map((entry) => entry.type).filter(Boolean))];

  return (
    <main className="catalog-page">
      <header className="page-hero">
        <div className="wrap">
          <span className="eyebrow">The mattress collection</span>
          <h1 className="ph-title">Explore the catalog.</h1>
          <p className="ph-sub">Browse {allEntries.length} mattress listings across {new Set(allEntries.map((e) => e.brand)).size} brands. Product details may be unverified; check each listing&apos;s verification notes.</p>
          <div className="catalog-quick-links">
            <Link href="/find-match" className="btn btn-primary">Find My Mattress →</Link>
            <Link href="/compare" className="btn btn-ghost-dark">Compare mattresses</Link>
          </div>
        </div>
      </header>
      <section className="section">
        <div className="wrap">
          <div className="catalog-brand-wall" aria-label="Brands in this catalog">{brands.map((brand) => <span className="catalog-brand-pill" key={brand}><BrandLogo brand={brand} size={24} /><span>{brand}</span></span>)}</div>

          <div className="catalog-toolbar">
            <div className="catalog-filter-chips" role="group" aria-label="Filter by mattress type">
              {TYPE_FILTERS.map((f) => (
                <Link
                  key={f.key || 'all'}
                  href={buildHref(f.key, selectedSort)}
                  className={`catalog-filter-chip${selectedType === f.key ? ' active' : ''}`}
                  aria-current={selectedType === f.key ? 'true' : undefined}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <div className="catalog-sort-group">
              <span className="catalog-sort-label">Sort</span>
              <div className="catalog-sort-chips" role="group" aria-label="Sort results">
                {SORT_OPTIONS.map((s) => (
                  <Link
                    key={s.key || 'featured'}
                    href={buildHref(selectedType, s.key)}
                    className={`catalog-sort-chip${selectedSort === s.key ? ' active' : ''}`}
                    aria-current={selectedSort === s.key ? 'true' : undefined}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="catalog-meta"><span>{entries.length} listings</span><span>{types.length} mattress types</span><span>{brands.length} brands</span></div>
          {entries.length ? (
            <div className="catalog-grid">
              {entries.map((entry) => {
                const verification = getVerificationLevel(entry);
                return (
                  <article className="catalog-card reveal-up" key={entry.id}>
                    <Link href={`/mattress/${encodeURIComponent(entry.id)}`} className="catalog-card-image" aria-label={`View ${displayTitle(entry)} details`}>
                      <img
                        className="catalog-product-editorial-image"
                        src={
                          /latex/i.test(entry.type || '')
                            ? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=82'
                            : /foam/i.test(entry.type || '')
                              ? 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=82'
                              : /hybrid|innerspring/i.test(entry.type || '')
                                ? 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=82'
                                : 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=82'
                        }
                        alt={`Illustrative bedroom inspiration for ${entry.type || 'mattress'} mattresses; not a photograph of this product`}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="catalog-image-disclosure">Room inspiration · illustrative</span>
                      <span className={`catalog-verify-badge vlevel-${verification}`}>{VERIFICATION_LEVEL_LABEL[verification]}</span>
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
                );
              })}
            </div>
          ) : (
            <div className="catalog-empty"><h2>Catalog is being updated</h2><p>Try the matching quiz to explore options as the catalog becomes available.</p><Link href="/find-match" className="btn btn-primary">Find My Mattress</Link></div>
          )}
          <p className="catalog-disclaimer">Catalog listings are not endorsements. Specifications and prices are shown as recorded in our catalog; consult each product page for verification status and source notes.</p>
        </div>
      </section>
    </main>
  );
}
