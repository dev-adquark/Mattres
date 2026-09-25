export const metadata = {
  title: 'Privacy Policy — Mattress Match Score',
  description: 'What data this site collects, how sleep profiles are stored, and what is not tracked.',
};

export default function PrivacyPage() {
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
          <h1 className="ph-title">Privacy Policy</h1>
          <p className="ph-sub">Plain-language, accurate to what this site actually does — not boilerplate.</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap disc-wrap">
          <div className="disc-block">
            <h3>What we store</h3>
            <p>
              Your sleep profile answers and the resulting Match Score results are stored in your browser&apos;s
              session storage only — on your device, for this browser tab, until you close it or clear it. Nothing
              about your profile is sent to or stored on a server beyond the single request needed to compute your
              score.
            </p>
          </div>
          <div className="disc-block">
            <h3>What we don&apos;t do</h3>
            <p>
              This site does not currently run third-party analytics or advertising trackers. No cookies are set for
              tracking purposes. If that changes, this page will be updated to name the specific service and what it
              collects — not a vague future promise.
            </p>
          </div>
          <div className="disc-block">
            <h3>Affiliate links</h3>
            <p>
              Outbound retailer links carry UTM parameters (source, medium, campaign) so a retailer can attribute a
              visit to this site. These parameters do not identify you personally — they identify this site as the
              referrer, the same way any retailer&apos;s own analytics would see a link from any other site.
            </p>
          </div>
          <div className="disc-block contact-block">
            <h3>Questions</h3>
            <p>If anything here is unclear or you want data removed, reach out directly.</p>
            <a href="mailto:hello@mattressmatchscore.example" className="btn btn-ghost-dark">
              Contact us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
