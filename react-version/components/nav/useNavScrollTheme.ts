'use client';

import { useEffect, useState } from 'react';

/** Elements that switch the header to its dark theme while under it. */
const DARK_SELECTOR = '[data-nav-theme], .section--cinematic, .section--deep, .mood-dark';

/**
 * Samples the page under the header (a thin line at header mid-height,
 * rootMargin '-36px 0px -95% 0px') and returns 'dark' | 'light'.
 * Dark = an element with data-nav-theme="dark", or a full-width
 * .section--cinematic / .section--deep / .mood-dark block (plus the footer,
 * [data-site-footer]). data-nav-theme="light" opts a block out. The innermost
 * (last in document order) intersecting candidate wins. Re-scans when <main>
 * content changes.
 */
function useHeaderTheme(pathname: string | null): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const main = document.getElementById('main-content');
    const intersecting = new Set<Element>();
    let io: IntersectionObserver | null = null;
    let frame = 0;

    const decide = () => {
      let winner: Element | null = null;
      for (const el of intersecting) {
        if (!winner || winner.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) winner = el;
      }
      const attr = winner && winner.getAttribute('data-nav-theme');
      setTheme(winner && attr !== 'light' ? 'dark' : 'light');
    };

    const scan = () => {
      frame = 0;
      if (io) io.disconnect();
      intersecting.clear();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const wide = e.target.hasAttribute('data-nav-theme') || e.boundingClientRect.width >= window.innerWidth * 0.8;
            if (e.isIntersecting && wide) intersecting.add(e.target);
            else intersecting.delete(e.target);
          }
          decide();
        },
        { rootMargin: '-36px 0px -95% 0px' },
      );
      const footer = document.querySelector('[data-site-footer]');
      const nodes = [...(main ? main.querySelectorAll(DARK_SELECTOR) : []), ...(footer ? [footer] : [])];
      nodes.forEach((n) => io?.observe(n));
      if (!nodes.length) decide();
    };

    scan();
    const mo =
      main && typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            if (!frame) frame = requestAnimationFrame(scan);
          })
        : null;
    if (mo && main) mo.observe(main, { childList: true, subtree: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (mo) mo.disconnect();
      if (io) io.disconnect();
    };
  }, [pathname]);
  return theme;
}

/** True once the page has scrolled past the first few pixels. */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

/** Header theme (from the section beneath it) + scrolled state. */
export function useNavScrollTheme(pathname: string | null): { theme: 'dark' | 'light'; scrolled: boolean } {
  return { theme: useHeaderTheme(pathname), scrolled: useScrolled() };
}
