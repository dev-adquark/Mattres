import Link from 'next/link';
import AnimatedLogo from './AnimatedLogo';
import AmbientParticles from './AmbientParticles';
import BrandMarquee from './BrandMarquee';

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
          <div className="foot-links">
            <Link href="/">Home</Link>
            <Link href="/find-match">Match Score</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/methodology">Guides</Link>
            <Link href="/disclosures">About</Link>
          </div>
        </div>

        <div style={{ margin: '8px 0 28px' }}>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14, opacity: 0.7 }}>
            Real brands referenced in our comparisons
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
