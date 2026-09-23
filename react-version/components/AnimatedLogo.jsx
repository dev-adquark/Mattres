'use client';

/**
 * Animated crescent-moon brand mark: soft breathing glow + a tiny orbiting
 * spark. `idSuffix` must be unique per instance on the page since SVG
 * gradient/filter ids are global to the document (this component is used
 * once in the header and once in the footer).
 */
export default function AnimatedLogo({ idSuffix = 'Header' }) {
  const gradId = `g${idSuffix}`;
  const glowId = `glow${idSuffix}`;
  return (
    <svg viewBox="0 0 32 32" fill="none" className="brand-logo" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="5" y1="5" x2="27" y2="27">
          <stop stopColor="#7bf2df" />
          <stop offset="1" stopColor="#14a893" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7bf2df" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7bf2df" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${glowId})`} className="logo-glow" />
      <path d="M27 18.5A11 11 0 1 1 13.5 5a8.5 8.5 0 0 0 13.5 13.5Z" fill={`url(#${gradId})`} />
      <circle className="logo-spark" cx="26" cy="9" r="1.1" fill="#fff" />
    </svg>
  );
}
