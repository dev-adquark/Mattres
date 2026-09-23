'use client';

/**
 * Original owl mascot (hand-drawn SVG, not a stock icon): geometric body,
 * glowing gradient eyes with a soft blink cycle, folded wings in the same
 * thin-stroke line style as the site's other icons, a small crescent-moon
 * accent tying it to the brand logo, and floating zzz's.
 *
 * variant="hero"  -> floating + a "Let's find your match" speech bubble
 * variant="empty" -> static-position, light-background color variant for
 *                    use inside a light card (the find-match empty state)
 */
export default function OwlMascot({ variant = 'hero', idSuffix }) {
  const suffix = idSuffix || variant;
  const bodyId = `owlBody${suffix}`;
  const eyeId = `owlEye${suffix}`;
  const wingId = `owlWing${suffix}`;
  const wrapClass = variant === 'hero' ? 'owl-mascot owl-mascot-hero' : 'owl-mascot owl-mascot-empty';
  const zClass = variant === 'empty' ? 'owl-z owl-z-light' : 'owl-z';

  return (
    <div className={wrapClass} aria-hidden="true">
      <svg viewBox="0 0 120 130">
        <defs>
          <linearGradient id={bodyId} x1="20" y1="20" x2="100" y2="110">
            <stop offset="0%" stopColor="#1a3350" />
            <stop offset="100%" stopColor="#0c1c30" />
          </linearGradient>
          <radialGradient id={eyeId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#bff4ff" />
            <stop offset="55%" stopColor="#3fd4ff" />
            <stop offset="100%" stopColor="#1288b8" />
          </radialGradient>
          <linearGradient id={wingId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fd4ff" />
            <stop offset="100%" stopColor="#22c9b0" />
          </linearGradient>
        </defs>
        <path d="M94 14A8 8 0 1 1 85 4 A6.2 6.2 0 1 0 94 14Z" fill="#7bf2df" opacity="0.9" className="owl-glow" />
        <circle cx="18" cy="18" r="1.6" fill="#8f6bff" opacity="0.7" />
        <circle cx="10" cy="34" r="1.1" fill="#7fe9ff" opacity="0.6" />
        <path d="M38 26 L32 8 L48 20 Z" fill={`url(#${bodyId})`} stroke="#3fd4ff" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M82 26 L88 8 L72 20 Z" fill={`url(#${bodyId})`} stroke="#3fd4ff" strokeWidth="1" strokeOpacity="0.4" />
        <path
          d="M60 22 C86 22 100 44 100 70 C100 96 82 108 60 108 C38 108 20 96 20 70 C20 44 34 22 60 22 Z"
          fill={`url(#${bodyId})`}
          stroke="#3fd4ff"
          strokeWidth="1.4"
          strokeOpacity="0.55"
        />
        <path d="M24 62 C18 76 20 92 32 100" fill="none" stroke={`url(#${wingId})`} strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
        <path d="M96 62 C102 76 100 92 88 100" fill="none" stroke={`url(#${wingId})`} strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
        <path d="M46 78 Q60 84 74 78" fill="none" stroke="#3fd4ff" strokeWidth="1.2" opacity="0.3" />
        <path d="M48 88 Q60 93 72 88" fill="none" stroke="#3fd4ff" strokeWidth="1.2" opacity="0.3" />
        <circle cx="45" cy="60" r="15" fill="#04101c" stroke="#3fd4ff" strokeWidth="1.2" strokeOpacity="0.5" />
        <circle cx="75" cy="60" r="15" fill="#04101c" stroke="#3fd4ff" strokeWidth="1.2" strokeOpacity="0.5" />
        <g className="owl-eye-pupil">
          <circle cx="45" cy="60" r="8" fill={`url(#${eyeId})`} />
          <circle cx="42" cy="57" r="2" fill="#ffffff" opacity="0.85" />
        </g>
        <g className="owl-eye-pupil" style={{ animationDelay: '.06s' }}>
          <circle cx="75" cy="60" r="8" fill={`url(#${eyeId})`} />
          <circle cx="72" cy="57" r="2" fill="#ffffff" opacity="0.85" />
        </g>
        <path d="M56 68 L64 68 L60 76 Z" fill="#8ff2e4" />
        <path d="M50 108 L47 115 M50 108 L53 115" stroke="#1a3350" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M70 108 L67 115 M70 108 L73 115" stroke="#1a3350" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {variant === 'hero' && <span className="owl-speech">Let&apos;s find your match</span>}
      <span className={`${zClass} z1`}>z</span>
      <span className={`${zClass} z2`}>z</span>
      <span className={`${zClass} z3`}>z</span>
    </div>
  );
}
