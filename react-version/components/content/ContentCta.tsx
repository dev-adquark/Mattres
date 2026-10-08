import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import type { LinkItem } from '@/lib/content/types';
import styles from './Content.module.css';

interface ContentCtaProps {
  /** Prefix for the section's heading id. */
  id?: string;
  title: string;
  body?: string;
  /** Primary action target (Find My Match, optionally pre-filled). */
  href?: string;
  secondary?: LinkItem;
}

/**
 * Closing call to action for editorial pages: one statement, one primary
 * action (Find My Match), one quiet secondary link. Deep-night mood so it
 * reads as a deliberate end to the article.
 */
export function ContentCta({ id = 'next-step', title, body, href = '/find-match', secondary }: ContentCtaProps) {
  return (
    <section className={cx('section section--deep', styles.cta)} aria-labelledby={`${id}-title`}>
      <div className={cx('container', styles.ctaInner)}>
        <h2 id={`${id}-title`} className={cx('display-l', styles.ctaTitle)}>
          {title}
        </h2>
        <div className={styles.ctaSide}>
          {body ? <p className={styles.ctaBody}>{body}</p> : null}
          <div className="cluster">
            <Button href={href} variant="primary" size="lg" arrow magnetic>
              Find My Match
            </Button>
            {secondary ? (
              <Button href={secondary.href} variant="ghost" size="lg">
                {secondary.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
