export default function DealBanner() {
  return (
    <div className="deal-banner">
      <div className="deal-banner-text">
        <span className="deal-banner-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="8" width="18" height="13" rx="1.5" />
            <path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
          </svg>
        </span>
        <div>
          <h4>Example seasonal promotion slot</h4>
          <p>Where a real, time-limited partner offer would appear once one exists.</p>
        </div>
      </div>
      <span className="demo-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        Placeholder — no active offer
      </span>
    </div>
  );
}
