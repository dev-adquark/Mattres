'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AnimatedLogo from './AnimatedLogo';
import OwlMascot from './OwlMascot';
import { prefersReducedMotion } from '@/lib/threeUtils';

const NAV_LINKS = [
  { href: '/mattresses', label: 'Shop Mattresses' },
  { href: '/compare', label: 'Compare' },
  { href: '/guides', label: 'Guides' },
  { href: '/methodology', label: 'Our Scoring' },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const magneticRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const el = magneticRef.current;
    if (!el) return undefined;
    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (!canHover || prefersReducedMotion()) return undefined;

    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.18;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.18;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    function onLeave() { el.style.transform = ''; }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="wrap nav-row">
        <Link href="/" className="brand" aria-label="Mattress Match Score home">
          <AnimatedLogo idSuffix="Header" />
          <span>Mattress Match Score</span>
        </Link>
        <OwlMascot variant="nav" idSuffix="Nav" />
        <div className="nav-links">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || (l.href === '/mattresses' && pathname.startsWith('/mattresses'));
            return <Link key={l.href} href={l.href} data-nav={l.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>{l.label}</Link>;
          })}
        </div>
        <div className="nav-right">
          <Link href="/find-match" className="btn btn-primary nav-main-cta" id="navMagneticCta" ref={magneticRef}>
            <OwlMascot variant="nav" idSuffix="NavCta" />
            <span>Find My Mattress</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <button className={`nav-toggle${menuOpen ? ' is-open' : ''}`} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-primary-menu" type="button" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} id="mobile-primary-menu" ref={menuRef} aria-hidden={!menuOpen}>
        {NAV_LINKS.map((l) => {
          const active = pathname === l.href || (l.href === '/mattresses' && pathname.startsWith('/mattresses'));
          return <Link key={l.href} href={l.href} data-nav={l.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} tabIndex={menuOpen ? 0 : -1}>{l.label}<span aria-hidden="true">↗</span></Link>;
        })}
        <Link href="/find-match" className="btn btn-primary mobile-menu-cta" tabIndex={menuOpen ? 0 : -1}>
          Find My Mattress <span aria-hidden="true">→</span>
        </Link>
      </div>
    </nav>
  );
}
