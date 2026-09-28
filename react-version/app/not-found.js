import Link from 'next/link';

export const metadata = {
  title: 'Page not found — Mattress Match Score',
  description: 'The page you were looking for could not be found. Explore mattresses or find your match.',
};

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-orb" aria-hidden="true" />
      <div className="not-found-content">
        <span className="not-found-kicker">Mattress Match Score · 404</span>
        <p className="not-found-number" aria-hidden="true">404</p>
        <h1>This page took a<br /><em>different turn.</em></h1>
        <p className="not-found-copy">The page may have moved, or the link may be out of date. Let’s get you back to finding a better night’s sleep.</p>
        <div className="not-found-actions">
          <Link href="/" className="btn btn-primary">Back to home <span aria-hidden="true">↗</span></Link>
          <Link href="/mattresses" className="btn btn-ghost-dark">Explore mattresses</Link>
        </div>
        <Link href="/find-match" className="not-found-quiet-link">Not sure where to start? Find your match →</Link>
      </div>
    </main>
  );
}
