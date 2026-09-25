import Link from 'next/link';

export const metadata = {
  title: 'Back Support for Heavier Back Sleepers — Mattress Match Score',
  description: 'How support and durability interact for heavier back sleepers, and what the scoring engine checks.',
};

export default function BackSupportGuide() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="wrap">
          <span className="eyebrow">Guide</span>
          <h1 className="ph-title">Back Support for Heavier Back Sleepers</h1>
          <p className="ph-sub">Two real risks that compound at higher body weight, and how each is scored.</p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap disc-wrap">
          <div className="disc-block">
            <h3>Why weight changes the answer</h3>
            <p>
              Back sleeping generally needs firmer support than side sleeping to keep the spine neutral, and higher
              body weight raises the firmness needed to avoid sinking at the hips. The real comfort-band logic in the
              scoring engine adjusts for this directly — the recommended firmness range for a given position shifts
              with weight band, it isn&apos;t a single fixed number.
            </p>
          </div>
          <div className="disc-block">
            <h3>Support and durability are linked, not the same thing</h3>
            <p>
              Support is about tonight&apos;s spinal alignment; durability is about whether that support holds up
              over years. The DURABILITY_SAG_RISK flag specifically checks top-foam density against a higher-weight
              threshold — a mattress can score well on Support today and still carry a real durability risk flag for
              a heavier sleeper, and both are worth reading, not just the headline score.
            </p>
          </div>
          <div className="disc-block">
            <h3>What to actually check</h3>
            <p>
              On any mattress&apos;s <Link href="/methodology">real sub-scores</Link>, look at Support and Durability
              together, and read any risk flags before the overall number. A high overall score with an unread
              durability flag is exactly the failure mode risk flags exist to prevent.
            </p>
          </div>
          <div className="disc-block contact-block">
            <h3>Get your real numbers</h3>
            <p>Your actual weight range changes both the recommended firmness band and the durability threshold.</p>
            <Link href="/find-match" className="btn btn-primary">
              Take the real quiz
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
