import Link from 'next/link';
import { displayTitle, formatPrice, MATTRESS_THUMB_COLORS } from '@/lib/format';

function MattressVisual({ type }) {
  const colors = MATTRESS_THUMB_COLORS[type] || MATTRESS_THUMB_COLORS.hybrid;
  return (
    <div className="home-product-visual" style={{ '--product-tone-a': colors[0], '--product-tone-b': colors[1] }} aria-hidden="true">
      <span className="home-product-orbit" />
      <div className="home-product-mattress">
        <span className="home-product-top" />
        <span className="home-product-side" />
        <span className="home-product-base" />
      </div>
      <span className="home-product-type">{type || 'Mattress'}</span>
    </div>
  );
}

export default function HomeProductShowcase({ catalog }) {
  const entries = catalog.slice(0, 10);
  if (!entries.length) return null;

  return (
    <section className="home-product-section" aria-labelledby="home-product-title">
      <div className="wrap">
        <div className="home-product-heading">
          <div>
            <span className="eyebrow-dark">The collection</span>
            <h2 id="home-product-title">Explore mattresses, your way.</h2>
            <p>Browse real entries from our catalog. Open any mattress for its details, sources and available scores.</p>
          </div>
          <Link className="home-product-all" href="/mattresses">View all mattresses <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="home-product-track" role="list" aria-label="Mattresses from our catalog">
          {entries.map((entry, index) => (
            <article className="home-product-card" key={entry.id} role="listitem">
              <Link href={`/mattress/${entry.id}`} className="home-product-card-link" aria-label={`View ${displayTitle(entry)}`}>
                <MattressVisual type={entry.type} />
                <div className="home-product-info">
                  <span className="home-product-kicker">{entry.brand} · {entry.type || 'Mattress'}</span>
                  <h3>{displayTitle(entry)}</h3>
                  <div className="home-product-price">{formatPrice(entry)}</div>
                  <span className="home-product-detail">View mattress <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        <div className="home-product-footnote">Catalog order is shown as provided by the live catalog; no paid placement or invented ratings.</div>
      </div>
    </section>
  );
}
