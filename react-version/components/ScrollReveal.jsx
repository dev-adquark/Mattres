'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Generic scroll-reveal for static card grids (feature list, duo cards,
 * method cards) that don't already have their own bespoke entrance
 * animation - one shared observer rather than one per component. Ported
 * from the original project's site-wide IIFE. Mounted once in the root
 * layout, which does NOT unmount on client-side navigation in the App
 * Router - so the effect explicitly depends on the current pathname
 * (rather than an empty dependency array) to guarantee it actually
 * re-scans for new .reveal-up elements after every route change, not
 * just on the very first page load.
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal-up:not(.in-view)');
    if (!revealEls.length) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      revealEls.forEach((el) => el.classList.add('in-view'));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
