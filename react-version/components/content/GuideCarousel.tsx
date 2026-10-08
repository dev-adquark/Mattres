import type { ReactNode } from 'react';
import { GUIDES } from '@/lib/content/guides';
import type { HeadingLevel } from '@/lib/content/types';
import type { Guide, MattressEntry } from '@/lib/types';
import { Slider } from '@/components/motion';
import { GuideCard } from './GuideCard';

interface GuideCarouselProps {
  /** Guide entries to show (default: every published guide). */
  guides?: readonly Guide[];
  /** Accessible name (required for more than one carousel per page). */
  label?: string;
  /** Analytics slider id ('home-guides' | 'guides-related' | 'guides-hub' | ...). */
  id?: string;
  /** Optional node shown left of the top controls. */
  header?: ReactNode;
  controls?: 'top' | 'bottom';
  /** Run the track to the viewport's right edge. */
  bleed?: boolean;
  /** Heading level for card titles. */
  headingLevel?: HeadingLevel;
  /** Optional catalog entries (forwarded to covers). */
  catalog?: MattressEntry[];
  className?: string;
}

const PER_VIEW = { base: 1.12, sm: 1.7, md: 2.3, lg: 3.15, xl: 3.4 };

/**
 * Guide carousel (brief v3 section 39): every published guide as a cover
 * card, on the shared accessible <Slider> (drag, swipe, keys, buttons).
 * Server component - covers render on the server, the Slider hydrates.
 */
export function GuideCarousel({
  guides = GUIDES,
  label = 'Sleep guides',
  id = 'guides-carousel',
  header = null,
  controls = 'top',
  bleed = true,
  headingLevel = 'h3',
  catalog,
  className,
}: GuideCarouselProps) {
  if (!guides.length) return null;
  return (
    <Slider label={label} id={id} header={header} controls={controls} bleed={bleed} perView={PER_VIEW} className={className}>
      {guides.map((g) => (
        <GuideCard key={g.slug} guide={g} headingLevel={headingLevel} catalog={catalog} />
      ))}
    </Slider>
  );
}
