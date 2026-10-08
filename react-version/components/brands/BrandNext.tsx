import Link from 'next/link';
import { guideCategoryLabel } from '@/lib/content/guides';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import type { Guide } from '@/lib/types';
import styles from './Brands.module.css';

interface BrandNextProps {
  name: string;
  /** The single model's title for a one-model brand; null for a lineup. */
  singleTitle: string | null;
  guides: readonly Pick<Guide, 'slug' | 'path' | 'title' | 'category'>[];
}

/** 6 - Read next, then the quiz. */
export function BrandNext({ name, singleTitle, guides }: BrandNextProps) {
  return (
    <Section mood="linen" id="next" className={styles.next}>
      <div className={styles.nextGrid}>
        <div>
          <h2 className={styles.sectionTitle}>Before you choose</h2>
          <ul className={styles.guideList}>
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={g.path} className={styles.guideLink}>
                  <span className={styles.guideCat}>{guideCategoryLabel(g.category)}</span>
                  <span className={styles.guideTitle}>{g.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.nextCta}>
          <h2 className={styles.nextTitle}>
            {singleTitle ? (
              <>
                Does the {singleTitle} fit <em>you?</em>
              </>
            ) : (
              <>
                Which {name} fits you, <em>if any?</em>
              </>
            )}
          </h2>
          <p className="muted">The quiz scores every mattress in the catalog, {name} included, against how you sleep.</p>
          <Button href="/find-match" arrow magnetic>
            Find My Match
          </Button>
        </div>
      </div>
    </Section>
  );
}
