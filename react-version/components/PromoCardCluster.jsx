import Link from 'next/link';

const DEMO_TAG = (
  <span className="demo-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
    Placeholder — demo content
  </span>
);

export default function PromoCardCluster() {
  return (
    <div className="promo-cluster">
      <div className="pc-card">
        <span className="pc-ribbon">Example offer</span>
        <span className="pc-icon-circle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="12" width="20" height="7" rx="2" />
            <path d="M2 12v-2a3 3 0 0 1 3-3h5" />
          </svg>
        </span>
        <h5>Better sleep, better you</h5>
        <p>Where a real seasonal offer would sit once one exists — layout only for now.</p>
        <Link href="/find-match" className="pc-cta">
          Explore deals
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        {DEMO_TAG}
      </div>

      <div className="pc-card">
        <span className="pc-icon-circle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m12 2 2.9 6.9L22 10l-5.5 5.1L18 22l-6-3.5L6 22l1.5-6.9L2 10l7.1-1.1Z" />
          </svg>
        </span>
        <h5>Real scoring, not star ratings</h5>
        <p>Every match runs through the same open, documented model — see exactly how.</p>
        <Link href="/methodology" className="pc-cta">
          View methodology
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="pc-card">
        <span className="pc-icon-circle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h5>What a Match Score covers</h5>
        <p style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          <span>✓ Pressure relief &amp; support</span>
          <span>✓ Cooling &amp; motion isolation</span>
          <span>✓ Edge support &amp; durability</span>
        </p>
      </div>

      <div className="pc-card">
        <span className="pc-ribbon violet">Featured</span>
        <span className="pc-icon-circle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="12" width="20" height="7" rx="2" />
            <path d="M2 12v-2a3 3 0 0 1 3-3h13a2 2 0 0 1 2 2v3" />
            <circle cx="6.5" cy="7" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <h5>Premium comfort, real results</h5>
        <p>Top-scoring mattresses across every sleep style, ranked by the real engine.</p>
        <Link href="/compare" className="pc-cta">
          View top matches
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        {DEMO_TAG}
      </div>

      <div className="pc-card">
        <span className="pc-ribbon">Example bundle</span>
        <span className="pc-icon-circle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="8" width="18" height="13" rx="1.5" />
            <path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
          </svg>
        </span>
        <h5>Mattress + pillow + protector</h5>
        <p>Where a real bundle offer would appear once a partner is confirmed.</p>
        {DEMO_TAG}
      </div>

      <div className="pc-card">
        <span className="pc-icon-circle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          </svg>
        </span>
        <h5>Buying guides, not testimonials</h5>
        <p>We don&apos;t publish fabricated reviews. Read the real buying guide instead.</p>
        <Link href="/mx.html" className="pc-cta">
          Read the guide
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
