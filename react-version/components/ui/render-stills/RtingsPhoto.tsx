'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { EntryPhoto } from '@/lib/rtings/photo';

// Only fetched in the browser, and only if the photo fails to load.
const LazyIllustration = dynamic(() => import('../MattressIllustration').then((m) => m.MattressIllustration));

interface RtingsPhotoProps {
  photo: EntryPhoto;
  sizes?: string;
  preload?: boolean;
  /** Show the credit as a link to the RTINGS review (default) or as plain text (inside another link). */
  creditLink?: boolean;
  /** false when the parent already prints the credit (e.g. a list row's caption under a small thumbnail). */
  showCredit?: boolean;
  fallbackIllustration: { type: string | null; seed: string | null };
  /** Class names come from the systemStyles barrel (passed in by MattressRender). */
  imageClassName?: string;
  creditClassName?: string;
}

/**
 * A credited RTINGS product photo. Rendered un-optimized on purpose: the
 * browser loads it straight from i.rtings.com (the only host the CSP allows),
 * so our image optimizer never proxies third-party URLs. If the photo cannot
 * be loaded the original render takes its place and the credit disappears with
 * the photo; nothing is left broken.
 */
export function RtingsPhoto({ photo, sizes, preload = false, creditLink = true, showCredit = true, fallbackIllustration, imageClassName, creditClassName }: RtingsPhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <LazyIllustration type={fallbackIllustration.type} seed={fallbackIllustration.seed} size="fluid" />;
  return (
    <>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        unoptimized
        sizes={sizes}
        loading={preload ? 'eager' : 'lazy'}
        fetchPriority={preload ? 'high' : undefined}
        referrerPolicy="no-referrer"
        className={imageClassName}
        onError={() => setFailed(true)}
      />
      {!showCredit ? null : creditLink ? (
        <a className={creditClassName} href={photo.creditUrl} target="_blank" rel="noopener noreferrer nofollow">
          {photo.credit}
          <span className="sr-only"> (opens the RTINGS review in a new tab)</span>
        </a>
      ) : (
        <span className={creditClassName}>{photo.credit}</span>
      )}
    </>
  );
}
