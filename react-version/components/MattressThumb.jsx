import { MATTRESS_THUMB_COLORS } from '@/lib/format';

/**
 * A compact, illustrative SVG mattress icon, tinted by construction type so
 * cards have real visual identity instead of plain text. Not a product
 * photo (no such asset exists) and not presented as one - an abstract mark
 * in the same visual language as the X-Ray/Universe illustrations used
 * throughout the site. Ported as-is from the original project's
 * mattressThumbSVG().
 */
export default function MattressThumb({ entry, className = 'mattress-thumb' }) {
  const colors = MATTRESS_THUMB_COLORS[entry.type] || MATTRESS_THUMB_COLORS.hybrid;
  const gid = `mt-grad-${entry.id}`;
  return (
    <svg className={className} viewBox="0 0 64 40" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      <rect x="2" y="12" width="60" height="22" rx="6" fill={`url(#${gid})`} />
      <rect x="2" y="12" width="60" height="7" rx="6" fill="rgba(255,255,255,0.32)" />
      <g fill="rgba(255,255,255,0.55)">
        <circle cx="16" cy="19" r="1" />
        <circle cx="28" cy="19" r="1" />
        <circle cx="40" cy="19" r="1" />
        <circle cx="52" cy="19" r="1" />
        <circle cx="22" cy="26" r="1" />
        <circle cx="34" cy="26" r="1" />
        <circle cx="46" cy="26" r="1" />
      </g>
      <rect x="5" y="4" width="18" height="11" rx="5.5" fill="#fff" opacity="0.92" />
    </svg>
  );
}

/** Raw HTML-string variant for contexts needing innerHTML (e.g. imperative Three.js DOM overlays). */
export function mattressThumbHTML(entry) {
  const colors = MATTRESS_THUMB_COLORS[entry.type] || MATTRESS_THUMB_COLORS.hybrid;
  const gid = `mt-grad-${entry.id}`;
  return (
    `<svg class="mattress-thumb" viewBox="0 0 64 40" aria-hidden="true">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${colors[0]}"/><stop offset="100%" stop-color="${colors[1]}"/>` +
    `</linearGradient></defs>` +
    `<rect x="2" y="12" width="60" height="22" rx="6" fill="url(#${gid})"/>` +
    `<rect x="2" y="12" width="60" height="7" rx="6" fill="rgba(255,255,255,0.32)"/>` +
    `<g fill="rgba(255,255,255,0.55)">` +
    `<circle cx="16" cy="19" r="1"/><circle cx="28" cy="19" r="1"/><circle cx="40" cy="19" r="1"/><circle cx="52" cy="19" r="1"/>` +
    `<circle cx="22" cy="26" r="1"/><circle cx="34" cy="26" r="1"/><circle cx="46" cy="26" r="1"/>` +
    `</g>` +
    `<rect x="5" y="4" width="18" height="11" rx="5.5" fill="#fff" opacity="0.92"/>` +
    `</svg>`
  );
}
