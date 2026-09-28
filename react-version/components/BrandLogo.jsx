'use client';

import { useState } from 'react';
import { brandLogoUrl } from '@/lib/brandLogos';

/**
 * Renders a real brand's real logo (see lib/brandLogos.js) next to its
 * name. Renders nothing - not a placeholder icon, not a broken-image
 * icon - when the brand has no confirmed domain, or when the logo
 * request itself fails; either way the brand name text next to it
 * always stands on its own.
 */
export default function BrandLogo({ brand, size = 32, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = brandLogoUrl(brand, size * 2);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={`${brand} official logo`}
      width={size}
      height={size}
      className={`brand-logo-img brand-logo-premium ${className}`.trim()}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
