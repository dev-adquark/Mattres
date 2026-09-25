import Link from 'next/link';

export const metadata = {
  title: 'Pressure Relief for Side Sleepers — Mattress Match Score',
  description: 'What actually affects pressure relief for side sleepers, and how the real scoring engine weighs it.',
};

export default function PressureReliefGuide() {
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
          <h1 className="ph-title">Pressure Relief for Side Sleepers</h1>
          <p className="ph-sub">What actually matters, and how it&apos;s scored — not general wellness advice.</p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap disc-wrap">
          <div className="disc-block">
            <h3>Why side sleeping needs more pressure relief</h3>
            <p>
              Lying on your side concentrates body weight over a smaller contact area — mainly the shoulder and hip
              — than back or stomach sleeping does. A surface that&apos;s too firm for your body weight in that
              position can create localized pressure at those points rather than distributing weight evenly.
            </p>
          </div>
          <div className="disc-block">
            <h3>What the real scoring engine actually checks</h3>
            <p>
              The Pressure Relief sub-score is one of the six real categories in the scoring model. It weighs how a
              mattress&apos;s firmness compares to the recommended comfort band for your specific sleep position and
              weight range — not a single fixed number for &ldquo;side sleepers&rdquo; in general. See the real
              weights on the <Link href="/methodology">methodology page</Link>.
            </p>
          </div>
          <div className="disc-block">
            <h3>Common tradeoffs</h3>
            <p>
              A softer surface generally improves pressure relief for side sleepers but can reduce edge support and,
              at extremes, spinal alignment for heavier bodies. This is exactly what the SUPPORT_THRESHOLD_MISMATCH
              and PREFERRED_FIRMNESS_MISMATCH risk flags exist to surface — a mattress can score well on pressure
              relief while still carrying a flag worth reading.
            </p>
          </div>
          <div className="disc-block contact-block">
            <h3>See your own real result</h3>
            <p>Pressure relief for side sleepers isn&apos;t one-size-fits-all — your weight range changes the answer.</p>
            <Link href="/find-match" className="btn btn-primary">
              Take the real quiz
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
