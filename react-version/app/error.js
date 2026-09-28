'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Keep diagnostics in the browser console for debugging without exposing
    // technical details to visitors.
    console.error('Application route error:', error);
  }, [error]);

  return (
    <main className="route-error-page">
      <div className="route-error-content">
        <span className="route-error-kicker">Mattress Match Score · Something went wrong</span>
        <span className="route-error-symbol" aria-hidden="true">!</span>
        <h1>Let’s get you<br /><em>back on track.</em></h1>
        <p>That page ran into an unexpected issue. You can try loading it again or return to the homepage.</p>
        <div className="route-error-actions">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again <span aria-hidden="true">↻</span></button>
          <Link href="/" className="btn btn-ghost-dark">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
