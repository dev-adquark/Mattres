import type { ReactNode } from 'react';
import { Slider } from '@/components/motion';
import { ProductCard } from '@/components/ui/ProductCard';
import type { MattressEntry } from '@/lib/types';
import styles from './Brands.module.css';

interface BrandLineupProps {
  name: string;
  /** Order comes from the caller (engine reference score, best first). */
  entries: readonly MattressEntry[];
  header?: ReactNode;
}

/** The brand's lineup as an editorial carousel, directly under the wordmark. */
export function BrandLineup({ name, entries, header }: BrandLineupProps) {
  return (
    <Slider
      id="brand-lineup"
      label={`${name} lineup`}
      perView={{ base: 1.15, sm: 1.8, md: 2.4, lg: 3.15, xl: 3.6 }}
      controls="top"
      progress="bar"
      bleed
      header={header}
      className={styles.lineupSlider}
    >
      {entries.map((e) => (
        <ProductCard key={e.id} entry={e} headingLevel="h3" />
      ))}
    </Slider>
  );
}
