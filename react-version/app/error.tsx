'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import s from '@/components/trust/ErrorStates.module.css';

interface RouteErrorProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment (stable since Next 16.3). */
  retry?: () => void;
  /** Re-renders without re-fetching; used only when `retry` is unavailable. */
  reset?: () => void;
}

/**
 * Route error boundary. Shows a plain-language message and a way out;
 * technical details stay in the browser console, never on the page.
 */
export default function RouteError({ error, retry, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  const tryAgain = () => {
    if (typeof retry === 'function') retry();
    else if (typeof reset === 'function') reset();
  };

  return (
    <section className={`section section--editorial ${s.wrap}`} data-compare-tray="off" aria-labelledby="err-title">
      <div className="container container--narrow">
        <div className={s.copy}>
          <p className="eyebrow">Something went wrong</p>
          <h1 id="err-title" className="display">
            That didn&apos;t load. <em>Let&apos;s try again.</em>
          </h1>
          <p className="lead">
            Part of this page hit an unexpected problem. Trying again usually fixes it. Your quiz answers and compare list
            are kept in your browser, so nothing is lost.
          </p>
          <div className={s.actions}>
            <Button size="lg" onClick={tryAgain} icon={<RotateCcw aria-hidden="true" />}>
              Try again
            </Button>
            <Button href="/" variant="ghost" size="lg">
              Back to home
            </Button>
          </div>
          <p className="small muted">
            Still stuck? <Link className="link" href="/mattresses">Browse all mattresses</Link> or{' '}
            <Link className="link" href="/find-match">start the quiz</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
