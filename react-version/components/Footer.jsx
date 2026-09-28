import Link from 'next/link';
import AnimatedLogo from './AnimatedLogo';
import AmbientParticles from './AmbientParticles';
import BrandMarquee from './BrandMarquee';

// Grouped by real purpose (product / learn / legal) instead of one flat
// row of 7 links - Privacy and Terms are real, existing routes that,
// until now, were never linked from anywhere outside their own pages.
const FOOTER_GROUPS = [
  {
    heading: 'Product',
    links: [
      { href: '/find-match', label: 'Find My Mattress' },
      { href: '/compare', label: 'Compare' },
      { href: '/methodology', label: 'How Scoring Works' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { href: '/guides', label: 'Mattress Guides' },
      { href: '/faq', label: 'FAQ' },
      { href: '/disclosures', label: 'About & disclosures' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer>
      <AmbientParticles className="ambient-canvas" />
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Link href="/" className="brand">
              <AnimatedLogo idSuffix="Footer" />
              Mattress Match Score
            </Link>
            <p>Smarter Sleep. Better You.</p>
            <div className="brand-cylinder" aria-hidden="true">
              <div className="bc-inner">
                <span>Score</span>
                <span>Sleep</span>
                <span>Match</span>
                <span>Repeat</span>
              </div>
            </div>
          </div>
          <div className="foot-groups">
            {FOOTER_GROUPS.map((group) => (
              <div className="foot-group" key={group.heading}>
                <span className="foot-group-heading">{group.heading}</span>
                {group.links.map((l) => (
                  <Link key={l.href} href={l.href}>
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ margin: '28px 0 28px' }}>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14, opacity: 0.7 }}>
            Real mattress brands
          </span>
          <BrandMarquee />
        </div>

        <div className="foot-bottom">
          <span>© 2026 Mattress Match Score. All rights reserved.</span>
          <div className="legal">
            <Link href="/disclosures">Affiliate disclosure</Link>
            <a href="mailto:hello@mattressmatchscore.example">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
