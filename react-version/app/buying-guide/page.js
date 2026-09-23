import BrandMarquee from '@/components/BrandMarquee';
import SpotlightCard from '@/components/SpotlightCard';

export const metadata = {
  title: 'Smart Buying Guide — Mattress Match Score',
  description:
    'A practical, plain-English guide to comparing products and pricing before you buy — reviews, timing, warranties, and common mistakes to avoid.',
};

export default function SmartBuyingGuidePage() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true"><span /><span /><span /></div>
        <div className="wrap">
          <span className="eyebrow">Buying Guide</span>
          <h1 className="ph-title">Smart Buying Guide</h1>
          <p className="ph-sub">
            A practical, plain-English guide to comparing products and pricing before you buy. Independent research —
            we may earn a commission from some links, same as the rest of this site (see our{' '}
            <a href="/disclosures">disclosures</a>).
          </p>
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
                  <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
                  <path d="m8.5 12 2.2 2.2L15.5 9" />
                </svg>
              </span>
              Getting value from reviews
            </h3>
            <p>
              Reviews are most useful for finding failure modes, not for ranking. A review that only lists features
              tells you little; one that describes what went wrong after six months tells you a great deal.
            </p>
            <h2 style={{ fontSize: '1.05rem', margin: '18px 0 8px' }}>Read for patterns</h2>
            <ul style={{ margin: '0 0 14px', paddingLeft: 20, color: 'var(--slate-600)' }}>
              <li>Look for the same complaint repeated by unrelated people.</li>
              <li>Weight long-term reviews above first-impression ones.</li>
              <li>Ignore both extremes; the useful detail sits in the middle ratings.</li>
            </ul>
            <p>One specific, repeated complaint is worth more than a hundred generic five-star ratings.</p>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </span>
              When to buy, and when to wait
            </h3>
            <p>
              Prices move in predictable cycles. New models arrive on a schedule, and the previous generation drops
              in price shortly before and after that date — often while remaining perfectly adequate.
            </p>
            <h2 style={{ fontSize: '1.05rem', margin: '18px 0 8px' }}>A simple approach</h2>
            <ul style={{ margin: '0 0 14px', paddingLeft: 20, color: 'var(--slate-600)' }}>
              <li>Check whether a refresh is due within a couple of months.</li>
              <li>Track the price for a week before buying; discounts are often measured against inflated reference prices.</li>
              <li>If the improvement in the new model does not affect your requirement list, buy the old one.</li>
            </ul>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 9h18M8 4v17" strokeOpacity="0.5" />
                </svg>
              </span>
              Warranty, returns and support
            </h3>
            <p>
              The return policy matters more than most specifications, because it is what protects you when the
              comparison turns out to be wrong. It is also the thing most people skim.
            </p>
            <h2 style={{ fontSize: '1.05rem', margin: '18px 0 8px' }}>Check before, not after</h2>
            <ul style={{ margin: '0 0 14px', paddingLeft: 20, color: 'var(--slate-600)' }}>
              <li>How long is the return window, and who pays return shipping?</li>
              <li>Is the warranty handled by the seller or the manufacturer?</li>
              <li>Is there a real support channel, or only a contact form?</li>
            </ul>
            <div className="callout-box">
              A shorter warranty from a company that answers the phone is often worth more than a longer one that
              requires a claim process.
            </div>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block">
            <h3>
              <span className="disc-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              </span>
              Mistakes that are easy to avoid
            </h3>
            <p>A few patterns account for most regretted purchases, and all of them are easy to spot once you know to look.</p>
            <h2 style={{ fontSize: '1.05rem', margin: '18px 0 8px' }}>Watch for these</h2>
            <ul style={{ margin: '0 0 14px', paddingLeft: 20, color: 'var(--slate-600)' }}>
              <li>Buying capacity you will never use because the step up seemed cheap.</li>
              <li>Choosing on brand familiarity rather than the requirement list.</li>
              <li>Treating a countdown timer or stock warning as real information.</li>
              <li>Comparing a discounted price against a reference price that never applied.</li>
            </ul>
            <p>Urgency is the most reliable warning sign. A genuinely good option is still a good option tomorrow.</p>
          </SpotlightCard>

          <SpotlightCard as="div" onLight className="disc-block contact-block">
            <h3>Before you commit — a short checklist</h3>
            <ul style={{ margin: '0 0 14px', paddingLeft: 20, color: 'var(--slate-600)' }}>
              <li>Does it meet every item on your requirement list?</li>
              <li>Do you know the total cost, including renewal and running costs?</li>
              <li>Have you read the failure modes, not just the ratings?</li>
              <li>Do you understand the return window?</li>
            </ul>
            <p>If all four are yes, further research usually changes very little.</p>
          </SpotlightCard>
        </div>
      </section>
    </div>
  );
}
