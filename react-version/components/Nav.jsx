'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AnimatedLogo from './AnimatedLogo';
import OwlMascot from './OwlMascot';
import { prefersReducedMotion } from '@/lib/threeUtils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/find-match', label: 'Match Score' },
  { href: '/compare', label: 'Compare' },
  { href: '/methodology', label: 'Guides' },
  { href: '/disclosures', label: 'About' },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const magneticRef = useRef(null);

  // Magnetic hover on the nav CTA - subtly follows the pointer within a
  // small range, snaps back on leave. Skipped for touch/no-hover devices
  // and reduced-motion, where it has no meaningful trigger.
  useEffect(() => {
    const el = magneticRef.current;
    if (!el) return undefined;
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (!canHover || prefersReducedMotion()) return undefined;

    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    function onLeave() {
      el.style.transform = '';
    }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <nav className="nav">
      <div className="wrap nav-row">
        <Link href="/" className="brand">
          <AnimatedLogo idSuffix="Header" />
          Mattress Match Score
        </Link>
        <OwlMascot variant="nav" idSuffix="Nav" />
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} data-nav={l.href} className={pathname === l.href ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <button className="icon-btn" aria-label="Search" type="button">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <Link href="/find-match" className="btn btn-primary" id="navMagneticCta" ref={magneticRef}>
            <OwlMascot variant="nav" idSuffix="NavCta" />
            Find My Match
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <button className="nav-toggle" aria-label="Menu" type="button" onClick={() => setMenuOpen((v) => !v)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mobile-menu" style={{ display: menuOpen ? 'flex' : undefined }}>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} data-nav={l.href} onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
