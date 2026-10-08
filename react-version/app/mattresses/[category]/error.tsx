'use client';

import { useEffect } from 'react';
import { CategoryUnavailable } from '@/components/catalog/CategoryUnavailable';

interface CategoryErrorProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment (Next 16.3+). */
  retry?: () => void;
  /** Re-renders without re-fetching (older boundary API). */
  reset?: () => void;
}

/** Segment error boundary: an inline, honest "ranking unavailable" state with ways forward. */
export default function CategoryError({ error, retry, reset }: CategoryErrorProps) {
  useEffect(() => {
    console.error('Category page error:', error);
  }, [error]);
  const tryAgain = typeof retry === 'function' ? retry : typeof reset === 'function' ? reset : null;
  return <CategoryUnavailable onRetry={tryAgain} />;
}
