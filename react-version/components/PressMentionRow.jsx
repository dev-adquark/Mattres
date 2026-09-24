/**
 * Every name here is invented (not a real publication), used purely to
 * demonstrate the layout. Explicitly labeled below rather than left to
 * imply real press coverage.
 */
const OUTLETS = ['The Daily Rest', 'Sleep Weekly', 'HomeGoods Digest', 'Morning Review', 'The Comfort Report'];

export default function PressMentionRow({ onLight = false }) {
  return (
    <div>
      <span className={`demo-label${onLight ? ' on-light' : ''}`} style={{ marginBottom: 12 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        Placeholder outlet names — illustrative layout only, not real press coverage
      </span>
      <div className="press-row">
        {OUTLETS.map((name) => (
          <span className={`press-chip${onLight ? ' on-light' : ''}`} key={name}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
