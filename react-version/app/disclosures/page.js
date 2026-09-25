import Link from 'next/link';
import BrandMarquee from '@/components/BrandMarquee';
import SpotlightCard from '@/components/SpotlightCard';

export const metadata = {
  title: 'Affiliate & sponsored listing disclosures — Mattress Match Score',
};

export default function DisclosuresPage() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true"><span /><span /><span /></div>
        <div className="wrap">
          <span className="eyebrow">Policies</span>
          <h1 className="ph-title">Affiliate &amp; sponsored listing disclosures</h1>
          <p className="ph-sub">How we make money, and how we keep it separate from what we recommend.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: '26px 24px 0' }}>
        <BrandMarquee onLight />
      </div>

      <section className="section dot-grid-bg">
        <div className="wrap disc-wrap">
          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M9.5 9.5c0-1.4 1.2-2.5 2.5-2.5s2.5.8 2.5 2c0 1.5-1.5 2-2.5 2.3-1.3.4-2.5 1-2.5 2.7 0 1.2 1.2 2 2.5 2s2.5-.9 2.5-2.3" />
                </svg>
              </span>
              How we make money
            </h3>
            <p>
              Mattress Match Score is free to use. As of today, this site has <strong>no live affiliate program and
              no paid sponsored placements</strong> — no brand has paid to appear in a &ldquo;Sponsored&rdquo; slot,
              and no purchase link is tied to a real retailer account yet. Neither arrangement is required for a
              mattress to appear in your results, and this page describes the system we&apos;ve built for when a
              real commercial relationship exists, so the same separation between paid placement and Match Score is
              already in force before any deal goes live.
            </p>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 14a4 4 0 0 0 5.66 0l2.34-2.34a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0L6 12.34a4 4 0 0 0 5.66 5.66l1-1" />
                </svg>
              </span>
              Affiliate links
            </h3>
            <p>
              &ldquo;View at retailer&rdquo; buttons are built with real UTM tracking parameters, but there is no
              live affiliate account behind them yet, so they don&apos;t currently route to a real retailer. When a
              genuine affiliate relationship exists, these same links will point at that retailer directly — the
              tracking mechanism is already built, only the destination is a placeholder today. They will never
              change the price you pay.
            </p>
            <div className="callout-box">
              We will add an FTC-compliant affiliate disclosure here the moment a real affiliate relationship goes
              live — not before.
            </div>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2Z" />
                  <path d="M16 8a5 5 0 0 1 0 8" />
                </svg>
              </span>
              Sponsored listings
            </h3>
            <p>
              Brands and retailers will be able to pay to appear in a labeled &ldquo;Sponsored&rdquo; slot. No brand
              has paid for placement yet — every mattress shown right now is ranked purely algorithmically.
            </p>
            <div className="badge-examples">
              <span className="listing-badge badge-sponsored">Sponsored Verified</span>
              <span className="listing-badge badge-top">Top match — Algorithmic Pick</span>
            </div>
            <p style={{ marginTop: 16 }}>
              Sponsored slots are visually and structurally separate from algorithmic rankings: a sponsored listing
              cannot claim the algorithmic &ldquo;Top match&rdquo; slot and is never blended into, or substituted
              for, a mattress&apos;s Match Score position. This separation is enforced in the ranking code itself,
              not just in this policy.
            </p>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
                  <path d="m8.5 12 2.2 2.2L15.5 9" />
                </svg>
              </span>
              Editorial independence
            </h3>
            <p>
              Match Scores are generated by the scoring model described in our{' '}
              <Link href="/methodology">methodology</Link>. Advertisers cannot purchase a higher score, alter
              sub-scores, or remove a risk flag.
            </p>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block contact-block">
            <h3>Questions about a listing?</h3>
            <p>
              If something looks off — outdated pricing, a missing disclosure, a flag you disagree with — tell us
              and we&apos;ll look into it.
            </p>
            <a href="mailto:hello@mattressmatchscore.example" className="btn btn-ghost-dark">
              Contact the editorial team
            </a>
          </SpotlightCard>
        </div>
      </section>
    </div>
  );
}
