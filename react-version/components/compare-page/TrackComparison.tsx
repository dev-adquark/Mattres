'use client';

import { useEffect } from 'react';
import { track, EVENTS } from '@/lib/analytics';

interface TrackComparisonProps {
  count: number;
  source: string;
  topic?: string;
}

/** Fires comparison_completed once when a server-rendered comparison (a topic page) is shown. Renders nothing. */
export function TrackComparison({ count, source, topic }: TrackComparisonProps) {
  useEffect(() => {
    track(EVENTS.COMPARISON_COMPLETED, { count, source, topic });
  }, [count, source, topic]);
  return null;
}
