'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { prefersReducedMotion } from '@/components/motion/useReducedMotion';
import styles from './SectionJump.module.css';

interface Item {
  id: string;
  label: string;
}

const MIN_SECTIONS = 4;
const MIN_PAGE_SCREENS = 3.5;

/**
 * Phone-only jump bar for long pages. It reads the page's own titled sections
 * (`section[aria-labelledby]` inside <main>), so it never duplicates or edits
 * their copy, and it only appears on pages with several such sections and
 * several screens of height. Shown while scrolling up, tucked away while
 * scrolling down; the section in view is marked aria-current="location".
 */
export function SectionJump() {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const trackRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const collect = () => {
      const found: Item[] = [];
      const seen = new Set<string>();
      document.querySelectorAll<HTMLElement>('#main-content section[aria-labelledby]').forEach((section) => {
        const heading = document.getElementById(section.getAttribute('aria-labelledby') ?? '');
        const label = heading?.textContent?.replace(/\s+/g, ' ').trim();
        if (!label || section.offsetHeight < 240 || seen.has(label)) return;
        if (!section.id) section.id = `section-${found.length + 1}`;
        section.style.scrollMarginTop = 'calc(var(--nav-h) + 3.5rem)';
        seen.add(label);
        found.push({ id: section.id, label });
      });
      const tall = document.documentElement.scrollHeight > window.innerHeight * MIN_PAGE_SCREENS;
      setItems(found.length >= MIN_SECTIONS && tall ? found : []);
    };
    if (pathname === '/mattresses') return; // the catalog keeps its own sticky filter bar
    const timer = window.setTimeout(collect, 400);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!items.length) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < window.innerHeight * 0.6) setShow(false);
        else if (y < last - 6) setShow(true);
        else if (y > last + 6) setShow(false);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  useEffect(() => {
    if (!items.length) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        const first = items.find((i) => visible.has(i.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    for (const i of items) {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const chip = trackRef.current?.querySelector<HTMLElement>('[aria-current="location"]');
    chip?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
  }, [active]);

  if (!items.length || pathname === '/mattresses') return null;
  return (
    <nav className={styles.bar} data-show={show} aria-label="Sections on this page" aria-hidden={!show || undefined}>
      <ul className={styles.track} ref={trackRef}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.chip}
              aria-current={active === item.id ? 'location' : undefined}
              tabIndex={show ? 0 : -1}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
