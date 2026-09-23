'use client';

/**
 * Small sleeper character: a rounded blanket-mound body, a round head with
 * a closed-eye curve, a soft breathing scale-pulse, and 2 floating "z"s
 * (reusing the same sway-and-fade animation as the owl mascot's zzz, for
 * visual consistency between the site's two mascots).
 *
 * placement="nav"  -> small, sits next to the header logo
 * placement="hero" -> larger, floats in the homepage hero's open corner
 */
export default function SleeperCharacter({ placement = 'nav' }) {
  const gradId = `sBody${placement === 'nav' ? 'Nav' : 'Hero'}`;
  const wrapClass = placement === 'nav' ? 'nav-sleeper' : 'hero-sleeper';

  return (
    <div className={wrapClass} aria-hidden="true">
      <svg viewBox="0 0 36 26">
        <defs>
          <linearGradient id={gradId} x1="4" y1="6" x2="32" y2="24">
            <stop offset="0%" stopColor="#1a3350" />
            <stop offset="100%" stopColor="#0c1c30" />
          </linearGradient>
        </defs>
        <ellipse cx="9" cy="21" rx="7.5" ry="2.6" fill="rgba(255,255,255,0.12)" />
        <path
          className="sleeper-body"
          d="M3 23 Q3 11 17 11 Q31 11 31 23 Z"
          fill={`url(#${gradId})`}
          stroke="#3fd4ff"
          strokeWidth="1"
          strokeOpacity="0.45"
        />
        <circle cx="11" cy="10" r="5.4" fill={`url(#${gradId})`} stroke="#3fd4ff" strokeWidth="1" strokeOpacity="0.45" />
        <path d="M8.7 10.3q1.1 .9 2.2 0" fill="none" stroke="#3fd4ff" strokeWidth=".9" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className="sleeper-z z1">z</span>
      <span className="sleeper-z z2">z</span>
    </div>
  );
}
