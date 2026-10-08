/**
 * Lifecycle signals for the stage's host element: on/off screen (the loop
 * pauses off screen), the ~40% reveal threshold, size changes, page scroll
 * and tab visibility. Every observer degrades gracefully when the API is
 * missing (the reveal then fires at once).
 */

export interface HostObserverHandlers {
  /** Host within 80px of the viewport, or not. */
  onVisible(visible: boolean): void;
  /** Fires once, when ~40% of the host is on screen. */
  onRevealThreshold(): void;
  onResize(): void;
  onScroll(): void;
  /** Document became hidden / visible. */
  onDocumentHidden(hidden: boolean): void;
}

export function observeHost(host: HTMLElement, handlers: HostObserverHandlers): () => void {
  const hasIO = typeof IntersectionObserver !== 'undefined';
  const io = hasIO
    ? new IntersectionObserver(
        (entries) => {
          let visible = true;
          entries.forEach((en) => {
            visible = en.isIntersecting;
          });
          handlers.onVisible(visible);
        },
        { rootMargin: '80px' },
      )
    : null;
  io?.observe(host);

  const revealIo = hasIO
    ? new IntersectionObserver(
        (entries, obs) => {
          if (entries.some((en) => en.isIntersecting && en.intersectionRatio >= 0.4)) {
            obs.disconnect();
            handlers.onRevealThreshold();
          }
        },
        { threshold: [0, 0.4, 0.6] },
      )
    : null;
  if (revealIo) revealIo.observe(host);
  else handlers.onRevealThreshold();

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handlers.onResize()) : null;
  ro?.observe(host);

  const onScroll = () => handlers.onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  const onVisibility = () => handlers.onDocumentHidden(document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    io?.disconnect();
    revealIo?.disconnect();
    ro?.disconnect();
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
