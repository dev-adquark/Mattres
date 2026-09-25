import Link from 'next/link';

export const metadata = {
  title: 'Cooling Mattress Comparison — Mattress Match Score',
  description: 'What actually affects heat retention in a mattress, and how the scoring engine flags it.',
};

export default function CoolingGuide() {
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
          <h1 className="ph-title">Cooling Mattress Comparison</h1>
          <p className="ph-sub">What the Heat sub-score actually measures, and its real limits.</p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap disc-wrap">
          <div className="disc-block">
            <h3>What drives heat retention</h3>
            <p>
              All-foam mattresses without a cooling cover or gel infusion tend to trap more body heat than hybrids or
              innersprings, since coils allow airflow through the middle of the mattress that dense foam does not.
              This is a real, structural difference in how the two constructions behave, not a marketing claim.
            </p>
          </div>
          <div className="disc-block">
            <h3>How the real engine scores it</h3>
            <p>
              The Heat sub-score is computed from a mattress&apos;s type and whether it has a cooling cover — it
              reflects the mattress&apos;s own construction, not your stated sleep temperature. Your answer to
              &ldquo;do you sleep hot&rdquo; is used separately, to decide whether a mattress&apos;s real heat
              sub-score is a good or bad match for you specifically (the HEAT_RETENTION_LIKELY risk flag) — one
              mattress can carry the same real Heat sub-score for everyone, but only trigger a flag for a hot
              sleeper.
            </p>
          </div>
          <div className="disc-block">
            <h3>What this can&apos;t tell you</h3>
            <p>
              The engine doesn&apos;t have lab-measured temperature data for every mattress in the catalog — it uses
              construction type and cover material as a reasonable proxy, which is disclosed as such. A mattress
              marked unverified may have real cooling technology this catalog simply doesn&apos;t have confirmed
              data on yet.
            </p>
          </div>
          <div className="disc-block contact-block">
            <h3>See which real mattresses score well for hot sleepers</h3>
            <p>A documented preset comparison already exists for this.</p>
            <Link href="/compare/cooling-hybrids-for-couples" className="btn btn-primary">
              View cooling hybrids comparison
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
