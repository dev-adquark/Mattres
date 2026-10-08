'use client';

import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/components/ui/cx';
import styles from './Content.module.css';

export interface TocItem {
  id: string;
  title: string;
}

interface GuideTocProps {
  items: readonly TocItem[];
  label?: string;
}

const noopSubscribe = () => () => {};

/**
 * Table of contents. Desktop: always-open list that sits sticky beside the
 * article and marks the section being read (aria-current="location").
 * Below 1024px: a disclosure button ("On this page") that expands the same
 * list. Without JS the list is simply visible (the collapse is opt-in once
 * hydrated), so nothing is ever hidden from no-JS readers.
 */
export function GuideToc({ items, label = 'On this page' }: GuideTocProps) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const listId = useId();

  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter((h): h is HTMLElement => h !== null);
    if (headings.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        // Active = the first heading inside the reading band near the top
        // of the viewport; between headings the previous one stays active.
        const firstVisible = items.find((item) => visible.get(item.id));
        if (firstVisible) setActive(firstVisible.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className={styles.toc} aria-label={label} data-hydrated={hydrated || undefined}>
      <p className={cx('eyebrow eyebrow--plain', styles.tocTitle)}>{label}</p>
      <button
        type="button"
        className={styles.tocToggle}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <span className={styles.tocCount}>{items.length} sections</span>
        <ChevronDown aria-hidden="true" />
      </button>
      <ol id={listId} className={styles.tocList} data-open={open || undefined}>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={styles.tocLink}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={() => setOpen(false)}
            >
              <span className={styles.tocIndex} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{item.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
