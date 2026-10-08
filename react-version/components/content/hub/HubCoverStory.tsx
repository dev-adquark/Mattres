import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cx } from '@/components/ui/cx';
import { formatEditorialDate, guideCategoryLabel } from '@/lib/content/guides';
import type { Guide, MattressEntry } from '@/lib/types';
import { GuideCover } from '../GuideCover';
import { EmphasisTitle } from '../EmphasisTitle';
import styles from '../Hub.module.css';

interface HubCoverStoryProps {
  guide: Guide;
  catalog: MattressEntry[];
}

/** Cover story: the newest guide, full bleed. */
export function HubCoverStory({ guide, catalog }: HubCoverStoryProps) {
  return (
    <section className={styles.coverStory} aria-labelledby="cover-title">
      <Link href={guide.path} className={styles.coverLink} tabIndex={-1} aria-hidden="true">
        <GuideCover guide={guide} variant="feature" catalog={catalog} preload />
      </Link>
      <div className={cx('container container--wide', styles.coverText)}>
        <p className={styles.coverKicker}>
          <span>Newest guide</span>
          <span aria-hidden="true">·</span>
          <span>{guideCategoryLabel(guide.category)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={guide.published}>{formatEditorialDate(guide.published)}</time>
        </p>
        <h2 id="cover-title" className={styles.coverTitle}>
          <Link href={guide.path} className="link-quiet">
            <EmphasisTitle title={guide.title} emphasis={guide.emphasis} />
          </Link>
        </h2>
        <div className={styles.coverSide}>
          <p className={styles.coverDek}>{guide.dek}</p>
          <Link href={guide.path} className={styles.readLink}>
            Read the guide
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
