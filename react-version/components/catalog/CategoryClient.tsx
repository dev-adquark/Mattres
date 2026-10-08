'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track, EVENTS } from '@/lib/analytics';
import { compareHref } from '@/lib/compareStore';

/** Fires category_viewed { category, count } once per page view. */
export function CategoryViewTracker({ category, count }: { category: string; count: number }) {
  useEffect(() => {
    track(EVENTS.CATEGORY_VIEWED, { category, count });
  }, [category, count]);
  return null;
}

interface CompareTopThreeProps {
  ids: readonly string[];
  category: string;
  className?: string;
  children?: ReactNode;
}

/** "Compare the top three": opens /compare with the podium preselected. */
export function CompareTopThree({ ids, category, className, children }: CompareTopThreeProps) {
  if (!Array.isArray(ids) || ids.length < 2) return null;
  return (
    <Link
      href={compareHref(ids)}
      className={className}
      onClick={() => track(EVENTS.COMPARISON_STARTED, { source: 'category_top3', category, count: ids.length })}
    >
      {children || `Compare the top ${ids.length}`}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}
