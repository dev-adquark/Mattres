'use client';

import { useEffect } from 'react';
import { EVENTS, track } from '@/lib/analytics';

interface GuideViewTrackerProps {
  slug: string;
  category: string;
  kind?: 'guide' | 'position';
}

/** Fires guide_viewed once per mount for an editorial page. Renders nothing. */
export function GuideViewTracker({ slug, category, kind = 'guide' }: GuideViewTrackerProps) {
  useEffect(() => {
    track(EVENTS.GUIDE_VIEWED, { guide_slug: slug, category, kind });
  }, [slug, category, kind]);
  return null;
}
