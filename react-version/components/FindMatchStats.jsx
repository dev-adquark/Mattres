import NumberTicker from './NumberTicker';

/**
 * Every number here is real and independently checkable from the same
 * catalog/rules data the scoring engine itself reads - no invented
 * rating, no invented user count. The reference mockup this was built
 * from showed a "4.8/5 average rating" and "50K+ happy sleepers" card;
 * this site has no real user analytics to back numbers like that, so
 * they were replaced rather than reproduced.
 *
 * brandCount comes from the real database via a prop (this file is
 * bundled into the client, so it can't call the server-only
 * getCatalog() itself - see app/find-match/page.js).
 */
export default function FindMatchStats({ brandCount }) {
  return (
    <div className="fm-side-card">
      <h5>Real numbers, not marketing</h5>
      <p className="sub">Everything below is checkable against the actual catalog.</p>

      <div className="fm-ring-wrap">
        <svg className="fm-ring-svg" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="fmRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c9b0" />
              <stop offset="100%" stopColor="#3fd4ff" />
            </linearGradient>
          </defs>
          <circle className="fm-ring-track" cx="50" cy="50" r="42" />
          <circle className="fm-ring-progress" cx="50" cy="50" r="42" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={0} />
        </svg>
        <div className="fm-ring-center">
          <NumberTicker value={6} suffix="/6" />
        </div>
      </div>
      <p className="sub" style={{ textAlign: 'center', marginTop: -6 }}>
        real scoring dimensions applied to every match
      </p>

      <div className="fm-stat-row">
        <span className="ic" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="8" width="18" height="13" rx="1.5" />
            <path d="M3 12h18M12 8v13" />
          </svg>
        </span>
        <div>
          <b>
            <NumberTicker value={brandCount} />
          </b>
          <span>mattress brands in the catalog</span>
        </div>
      </div>
      <div className="fm-stat-row">
        <span className="ic" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
            <path d="m8.5 12 2.2 2.2L15.5 9" />
          </svg>
        </span>
        <div>
          <b>0</b>
          <span>fabricated scores — ever</span>
        </div>
      </div>
    </div>
  );
}
