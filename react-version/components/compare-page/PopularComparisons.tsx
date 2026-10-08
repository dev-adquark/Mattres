import type { ReactNode } from 'react';
import { Slider } from '@/components/motion';
import { COMPARE_PAIRS } from '@/lib/comparePairs';
import type { MattressEntry, VsPage } from '@/lib/types';
import { PairCard } from './PairCard';
import type { HeadingLevel } from './types';

interface PopularComparisonsProps {
  /** The catalog (for the illustration type of each mattress). */
  entries: readonly MattressEntry[] | null | undefined;
  /** A pair slug to leave out (the page you are on). */
  exclude?: string;
  pairs?: readonly VsPage[];
  label?: string;
  header?: ReactNode;
  id?: string;
  headingLevel?: HeadingLevel;
  bleed?: boolean;
}

/** The curated head-to-heads as a carousel (shared <Slider>: drag, swipe, keys, buttons). */
export function PopularComparisons({
  entries,
  exclude,
  pairs = COMPARE_PAIRS as readonly VsPage[],
  label = 'Head-to-head comparisons',
  header = null,
  id = 'compare-pairs',
  headingLevel = 'h3',
  bleed = true,
}: PopularComparisonsProps) {
  const byId = new Map((entries || []).map((e) => [e.id, e]));
  const items = pairs.filter((p) => p.slug !== exclude && byId.has(p.a) && byId.has(p.b));
  if (!items.length) return null;
  return (
    <Slider label={label} id={id} header={header} controls="top" bleed={bleed} perView={{ base: 1.08, sm: 1.6, md: 2.2, lg: 3.05, xl: 3.5 }}>
      {items.map((p) => (
        <PairCard key={p.slug} pair={p} a={byId.get(p.a)} b={byId.get(p.b)} headingLevel={headingLevel} />
      ))}
    </Slider>
  );
}
