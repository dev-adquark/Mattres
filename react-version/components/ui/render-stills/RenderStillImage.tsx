'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { RenderStill } from './stills';

// Only fetched in the browser, and only if a still actually fails to load.
const LazyIllustration = dynamic(() => import('../MattressIllustration').then((m) => m.MattressIllustration));

interface RenderStillImageProps {
  still: RenderStill | null;
  alt: string;
  sizes?: string;
  /**
   * The LCP image of the page. Renders loading="eager" + fetchPriority="high"
   * (not next/image `preload`, which must not be combined with `loading` and
   * only duplicates an image that is already in the initial HTML).
   */
  preload?: boolean;
  className?: string;
  /**
   * What to draw if the still is missing or fails to load: a tiny
   * serializable descriptor for the SVG mattress illustration, which is then
   * rendered client-side. Keeps the (large) SVG out of the RSC payload of
   * every page that shows a still.
   */
  fallbackIllustration?: { type: string | null; seed: string | null };
  /** Legacy: an arbitrary node rendered on failure. Prefer fallbackIllustration. */
  fallback?: ReactNode;
}

/**
 * next/image wrapper for the generated render stills. If the file cannot be
 * loaded it swaps to the fallback, so a missing or blocked image never leaves
 * a broken frame.
 */
export function RenderStillImage({ still, alt, sizes, preload = false, className, fallbackIllustration, fallback = null }: RenderStillImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed || !still) {
    if (fallbackIllustration) return <LazyIllustration type={fallbackIllustration.type} seed={fallbackIllustration.seed} size="fluid" />;
    return <>{fallback}</>;
  }
  return (
    <Image
      src={still.src}
      width={still.width}
      height={still.height}
      alt={alt}
      sizes={sizes}
      loading={preload ? 'eager' : 'lazy'}
      fetchPriority={preload ? 'high' : undefined}
      placeholder="blur"
      blurDataURL={still.blurDataURL}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
