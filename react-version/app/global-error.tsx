'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Root error boundary: replaces the whole document, so it cannot use the
 * global stylesheet, CSS Modules or fonts. The inline styles here are
 * deliberate (the one place they are allowed for static values): they
 * mirror the Night Sleep Lab palette (Night Ink, Linen, Soft Cyan) with
 * system serif/sans fallbacks.
 */
const C = { ink: '#050b16', moon: '#e4dfd5', muted: '#9fa7b8', linen: '#e9e4da', cyan: '#8adfe9', rule: 'rgba(228,223,213,0.18)' } as const;

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders (stable since Next 16.3). */
  retry?: () => void;
  /** Re-renders without re-fetching; used only when `retry` is unavailable. */
  reset?: () => void;
}

export default function GlobalError({ error, retry, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Root error:', error);
  }, [error]);

  const tryAgain = () => {
    if (typeof retry === 'function') retry();
    else if (typeof reset === 'function') reset();
  };

  return (
    <html lang="en">
      <head>
        <title>Something went wrong · Mattress Match Score</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: `radial-gradient(70% 55% at 82% 0%, rgba(43,58,103,0.55), transparent 72%), ${C.ink}`,
          color: C.moon,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <main
          style={{ minHeight: '100vh', boxSizing: 'border-box', display: 'grid', alignContent: 'center', padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2.75rem)' }}
        >
          <div style={{ width: '100%', maxWidth: '46rem', margin: '0 auto' }}>
            <p style={{ margin: '0 0 2.5rem', fontFamily: 'Georgia, "Iowan Old Style", serif', fontSize: '1.15rem', color: C.linen }}>
              Mattress Match <em>Score</em>
            </p>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75em', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>
              <span aria-hidden="true" style={{ width: '1.75em', height: 1, background: C.cyan, display: 'inline-block' }} />
              Something went wrong
            </p>
            <h1
              style={{ margin: '1.25rem 0 1.5rem', fontFamily: 'Georgia, "Iowan Old Style", serif', fontWeight: 400, fontSize: 'clamp(2.5rem, 7vw, 4.75rem)', lineHeight: 1, letterSpacing: '-0.03em', color: '#f6f3ed' }}
            >
              A short pause. <em style={{ fontWeight: 300 }}>We&apos;ll get you back.</em>
            </h1>
            <p style={{ margin: '0 0 2rem', maxWidth: '52ch', fontSize: '1.125rem', lineHeight: 1.6, color: C.muted }}>
              The site hit an unexpected error while loading. Trying again usually fixes it. Your quiz answers and compare
              list are kept in your browser.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={tryAgain}
                style={{ cursor: 'pointer', minHeight: 48, padding: '0 1.5rem', border: 0, borderRadius: 999, background: C.linen, color: C.ink, font: '600 1rem ui-sans-serif, system-ui, sans-serif' }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 1.5rem', borderRadius: 999, border: `1px solid ${C.rule}`, color: C.moon, textDecoration: 'none', fontWeight: 600 }}
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
