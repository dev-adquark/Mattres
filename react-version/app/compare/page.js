import Link from 'next/link';
import BrandMarquee from '@/components/BrandMarquee';
import PromoGrid from '@/components/PromoGrid';
import TrustBadgeRow from '@/components/TrustBadgeRow';
import AuditBanner from '@/components/AuditBanner';
import CompareGrid from '@/components/CompareGrid';
import { matchProfile } from '@/lib/matchLogic';

// The fixed reference profile this page compares against, matching the
// original project's static demo page exactly: side sleeper, 130-180lb
// band, medium-firm preference, warm sleeper, under $1,000. weightLb is
// set to the band's midpoint (155) rather than copied verbatim from
// nowhere - the real scoring math only reads weight through
// resolveWeightBand() and a 200lb durability threshold this band never
// crosses, so any value inside [130,180) produces identical scores;
// 155 is simply a representative value, not a guess that could change
// the real output.
//
// This is a genuine improvement over the original: the original site
// was a single static HTML file with no server, so these scores had to
// be computed once, offline, and pasted into the page as static markup.
// Here there's a real server, so this page calls the actual scoreEngine
// fresh on every request via the same matchProfile() the real quiz flow
// uses - one implementation, always current, never a stale copy that
// could drift from the real engine.
const DEMO_PROFILE = {
  sleepPosition: 'side',
  weightLb: 155,
  preferredFirmnessLabel: 'medium-firm',
  sleepTemperature: 'hot',
  motionSensitivity: 'single',
  painFocus: [],
  mattressTypePreference: [],
  budgetUsd: { min: 0, max: 1000 },
};

export const metadata = {
  title: 'Best mattresses for side sleepers under $1,000 — Mattress Match Score',
};

export default function ComparePage() {
  const { results, modelVersion, catalogAudit } = matchProfile(DEMO_PROFILE);

  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true"><span /><span /><span /></div>
        <div className="wrap">
          <span className="eyebrow">Compare · Side sleepers under $1,000</span>
          <h1 className="ph-title">Best mattresses for side sleepers under $1,000</h1>
          <p className="ph-sub">
            Ranked by Match Score for a demo sleep profile. Sub-scores, risk flags, and review highlights are mapped
            directly to that profile&apos;s inputs.
          </p>
        </div>
      </header>

      <div className="wrap" style={{ padding: '26px 24px 0' }}>
        <BrandMarquee onLight />
      </div>

      <section className="section dot-grid-bg">
        <div className="wrap">
          <div className="compare-toolbar">
            <div className="chips">
              <span className="chip">Side sleeper</span>
              <span className="chip">130–180 lb</span>
              <span className="chip">Medium-firm</span>
              <span className="chip">Sleeps warm</span>
            </div>
            <div className="toolbar-actions">
              <span className="selected-count">{results.length} matches</span>
              <Link href="/find-match" className="btn btn-ghost-dark">
                Edit my profile
              </Link>
            </div>
          </div>

          <AuditBanner audit={catalogAudit} />
          <CompareGrid results={results} />

          <p className="compare-footnote">
            Scores reflect a placeholder demo profile (side sleeper, 130–180&nbsp;lb, medium-firm preference, warm
            sleeper) using scoring model <strong>v{modelVersion}</strong>.{' '}
            <Link href="/find-match">Retake the quiz</Link> for your own results, or read the{' '}
            <Link href="/methodology">full methodology</Link>.
          </p>

          <div style={{ marginTop: 48 }}>
            <PromoGrid onLight />
          </div>
          <div style={{ marginTop: 40 }}>
            <TrustBadgeRow onLight />
          </div>
        </div>
      </section>
    </div>
  );
}
