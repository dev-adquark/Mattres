/** Small client hooks and formatters shared by MattressViewer and its x-ray parts. */

import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

const COMPACT_QUERY = '(max-width: 639px)';

function subscribeCompact(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const getCompact = (): boolean => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(COMPACT_QUERY).matches : false);
const getCompactServer = (): boolean => false;

/** True under 640px (false on the server and on first hydration). */
export function useCompactViewport(): boolean {
  return useSyncExternalStore(subscribeCompact, getCompact, getCompactServer);
}

/** Becomes true (once) when the element comes within `rootMargin` of the viewport. */
export function useNearViewport(ref: RefObject<Element | null>, rootMargin = '300px'): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, near]);
  return near;
}

/** 1 -> "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');
