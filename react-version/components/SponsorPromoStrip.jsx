const DEMO_TAG = (
  <span className="demo-label" style={{ marginTop: 6 }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
    Placeholder — no real sponsor
  </span>
);

export default function SponsorPromoStrip() {
  return (
    <div className="fm-promo-strip">
      <div className="fm-sponsor-card">
        <span className="fm-sponsor-ribbon">Sponsored</span>
        <span className="fm-sponsor-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2" y="12" width="20" height="7" rx="2" />
            <path d="M2 12v-2a3 3 0 0 1 3-3h5" />
          </svg>
        </span>
        <div>
          <h5>Upgrade your sleep</h5>
          <p>Example premium-listing slot — real sponsored listings are labeled the same way in production.</p>
          {DEMO_TAG}
        </div>
      </div>

      <div className="fm-sponsor-card">
        <span className="fm-sponsor-ribbon">Sponsored</span>
        <span className="fm-sponsor-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2Z" />
            <path d="M16 8a5 5 0 0 1 0 8" />
          </svg>
        </span>
        <div>
          <h5>Top-rated picks this week</h5>
          <p>Where a real, dated sponsored slot would sit — see our sponsored-listing policy in Disclosures.</p>
          {DEMO_TAG}
        </div>
      </div>
    </div>
  );
}
