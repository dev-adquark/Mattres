import { Plus } from 'lucide-react';
import type { FaqItem, HeadingLevel } from '@/lib/content/types';
import styles from './content/Faq.module.css';
import { cx } from './ui/cx';

interface FaqAccordionProps {
  items: readonly FaqItem[] | null | undefined;
  headingLevel?: HeadingLevel;
  /** Index of the item open on first render (-1: none). */
  defaultOpen?: number;
  className?: string;
}

/**
 * Accessible FAQ list built on native <details>/<summary>: keyboard and
 * screen-reader behaviour come from the browser, it works without
 * JavaScript, and find-in-page can open a closed answer. Each question is a
 * real heading (headingLevel) so the page outline stays intact.
 *
 * items: [{ q, a }] - `a` is plain text, so the same string can be emitted
 * verbatim in FAQPage JSON-LD (see lib/content/seo.ts faqPageJsonLd).
 * Server component.
 */
export function FaqAccordion({ items, headingLevel = 'h3', defaultOpen = -1, className }: FaqAccordionProps) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const Heading = headingLevel;
  return (
    <div className={cx(styles.list, className)}>
      {items.map((item, i) => (
        <details key={item.q} className={styles.item} open={i === defaultOpen}>
          <summary className={styles.summary}>
            <Heading className={styles.question}>{item.q}</Heading>
            <span className={styles.icon} aria-hidden="true">
              <Plus />
            </span>
          </summary>
          <div className={styles.answer}>
            <p>{item.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

export default FaqAccordion;
