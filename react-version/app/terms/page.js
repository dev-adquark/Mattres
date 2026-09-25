export const metadata = {
  title: 'Terms of Service — Mattress Match Score',
  description: 'The terms for using this site, its scores, and its affiliate/sponsored content.',
};

export default function TermsPage() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="wrap">
          <span className="eyebrow">Legal</span>
          <h1 className="ph-title">Terms of Service</h1>
          <p className="ph-sub">What using this site means, in plain language.</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap disc-wrap">
          <div className="disc-block">
            <h3>What this site is</h3>
            <p>
              Mattress Match Score computes a real, rules-based compatibility score between your stated sleep profile
              and the mattresses in its catalog. It is a decision-support tool, not a substitute for trying a
              mattress yourself or consulting a medical professional about a sleep-related health condition.
            </p>
          </div>
          <div className="disc-block">
            <h3>No guarantee of fit</h3>
            <p>
              A high Match Score reflects the scoring model&apos;s rules applied to the data on file — it is not a
              guarantee you will personally find a mattress comfortable. Firmness feel, in particular, is subjective;
              use the in-home trial period retailers offer to confirm fit.
            </p>
          </div>
          <div className="disc-block">
            <h3>Data accuracy</h3>
            <p>
              Specs, prices, and other product details are marked as verified only when independently confirmed
              against a real source, with that source and date shown. Anything not marked verified should be treated
              as a placeholder pending confirmation, not a guaranteed current figure — see the note on every result
              and product page.
            </p>
          </div>
          <div className="disc-block">
            <h3>Affiliate &amp; sponsored content</h3>
            <p>
              This site may earn a commission from outbound retailer links, and some listings are paid sponsored
              placements. Sponsored status is always labeled and never affects the underlying Match Score
              calculation. See our full{' '}
              <a href="/disclosures">disclosures</a> for details.
            </p>
          </div>
          <div className="disc-block contact-block">
            <h3>Questions</h3>
            <p>Reach out if any of this needs clarifying.</p>
            <a href="mailto:hello@mattressmatchscore.example" className="btn btn-ghost-dark">
              Contact us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
