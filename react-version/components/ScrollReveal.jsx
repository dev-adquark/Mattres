'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Generic scroll-reveal for card grids (feature list, duo cards, method
 * cards, quiz result cards, dimension panels) that don't already have
 * their own bespoke entrance animation - one shared observer rather than
 * one per component. Ported from the original project's site-wide IIFE,
 * then extended here with a MutationObserver: the original only re-scanned
 * on pathname change (a real gap found while wiring this up to
 * ResultsGrid/SixDimensionGallery - their cards appear via a client-side
 * state update after a fetch, on the SAME route, so a route-change-only
 * scan would never observe them and they'd stay permanently invisible,
 * not just unanimated). The MutationObserver catches any .reveal-up
 * element appearing anywhere in the document, regardless of why.
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal-up:not(.in-view)').forEach((el) => el.classList.add('in-view'));
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

    function scan(root) {
      root.querySelectorAll('.reveal-up:not(.in-view)').forEach((el) => io.observe(el));
    }
    scan(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.('.reveal-up:not(.in-view)')) io.observe(node);
          if (node.querySelectorAll) scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
