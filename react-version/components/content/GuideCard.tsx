import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatEditorialDate, guideCategoryLabel } from '@/lib/content/guides';
import type { HeadingLevel } from '@/lib/content/types';
import type { Guide, MattressEntry } from '@/lib/types';
import { cx } from '@/components/ui/cx';
import { GuideCover } from './GuideCover';
import { EmphasisTitle } from './EmphasisTitle';
import styles from './GuideCard.module.css';

interface GuideCardProps {
  guide: Guide;
  headingLevel?: HeadingLevel;
  showDek?: boolean;
  /** Forwarded to the cover (the cooling cover plots the live catalog). */
  catalog?: MattressEntry[];
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * A guide as an editorial module: the cover, then category, title and a
 * one-line dek. The whole module is one link. Used by the guide carousel,
 * the hub index and anywhere a guide is promoted.
 */
export function GuideCard({ guide, headingLevel = 'h3', showDek = true, catalog, size = 'md', className }: GuideCardProps) {
  const Heading = headingLevel;
  return (
    <article className={cx(styles.card, styles[size], className)}>
      <Link href={guide.path} className={styles.link}>
        <GuideCover guide={guide} variant="tile" catalog={catalog} />
        <div className={styles.body}>
          <p className={styles.meta}>
            <span>{guideCategoryLabel(guide.category)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={guide.updated}>{formatEditorialDate(guide.updated)}</time>
          </p>
          <Heading className={styles.title}>
            <EmphasisTitle title={guide.title} emphasis={guide.emphasis} />
          </Heading>
          {showDek ? <p className={styles.dek}>{guide.description}</p> : null}
          <span className={styles.cta} aria-hidden="true">
            Read the guide <ArrowUpRight />
          </span>
        </div>
      </Link>
    </article>
  );
}
