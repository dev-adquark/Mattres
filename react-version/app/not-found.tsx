import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchLauncher } from '@/components/trust/SearchLauncher';
import { NotFoundSwitch } from '@/components/catalog/CategoryNotFound';
import s from '@/components/trust/ErrorStates.module.css';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That page could not be found. Search the site, take the sleep quiz or browse every mattress we score.',
  // No explicit robots: Next already marks a 404 response noindex, and a second tag would duplicate it.
  // Own openGraph object so the layout's og:url (the home page) is not inherited.
  openGraph: { title: 'Page not found', description: 'That page could not be found. Search the site, take the sleep quiz or browse every mattress we score.' },
};

interface Destination {
  href: string;
  name: string;
  desc: string;
}

const DESTINATIONS: readonly Destination[] = [
  { href: '/find-match', name: 'Find My Match', desc: 'Answer a few questions and get scored matches.' },
  { href: '/mattresses', name: 'All mattresses', desc: 'Browse and filter every mattress we score.' },
  { href: '/mattresses/best', name: 'Best mattresses', desc: 'The whole catalog, ranked by the engine.' },
  { href: '/sleep-position', name: 'Sleep positions', desc: 'What side, back and stomach sleepers need.' },
  { href: '/compare', name: 'Compare', desc: 'Put up to three finalists side by side.' },
  { href: '/guides', name: 'Sleep guides', desc: 'Firmness, cooling, pressure relief and more.' },
  { href: '/methodology', name: 'How it works', desc: 'Exactly how a Match Score is calculated.' },
];

export default function NotFound() {
  return (
    <NotFoundSwitch>
      <section className={`section section--cinematic ${s.wrap}`} data-nav-theme="dark" data-compare-tray="off" aria-labelledby="nf-title">
        <div className="container">
          <div className={s.grid}>
            <div className={s.copy}>
              <p className={s.numeral} aria-hidden="true">
                404
              </p>
              <p className="eyebrow">Page not found</p>
              <h1 id="nf-title" className="display">
                This page has <em>gone to sleep.</em>
              </h1>
              <p className="lead">
                The link may be old, or the address may have a typo. Search for a mattress, brand or guide, or pick up from one of
                the places below.
              </p>
              <div className={s.actions}>
                <SearchLauncher />
                <Button href="/" variant="ghost" size="lg">
                  Back to home
                </Button>
              </div>
            </div>
            <nav aria-labelledby="nf-dest">
              <p id="nf-dest" className={s.destTitle}>
                Popular destinations
              </p>
              <ol className={s.dest}>
                {DESTINATIONS.map((d, i) => (
                  <li key={d.href}>
                    <Link href={d.href}>
                      <span className={s.destNum}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={s.destName}>{d.name}</span>
                      <ArrowRight className={s.destArrow} aria-hidden="true" />
                      <span className={s.destDesc}>{d.desc}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </section>
    </NotFoundSwitch>
  );
}
