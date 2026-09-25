import Link from 'next/link';
import BrandMarquee from '@/components/BrandMarquee';
import PromoGrid from '@/components/PromoGrid';
import TrustBadgeRow from '@/components/TrustBadgeRow';
import AuditBanner from '@/components/AuditBanner';
import CompareGrid from '@/components/CompareGrid';
import { matchProfile } from '@/lib/matchLogic';

// The fixed reference profile this page compares against: side sleeper,
// 130-180lb band, medium-firm preference, warm sleeper. weightLb is set to
// the band's midpoint (155) rather than copied verbatim from nowhere - the
// real scoring math only reads weight through resolveWeightBand() and a
// 200lb durability threshold this band never crosses, so any value inside
// [130,180) produces identical scores; 155 is simply a representative
// value, not a guess that could change the real output.
//
// Budget cap raised from the original project's $1,000 to $2,000: the
// catalog now holds real, currently-sold mattress prices (not fabricated
// demo specs), and a $1,000 Queen-size cap only clears 1 of the 24 real
// products - a near-empty page. $2,000 clears 7, a real comparison set.
// Mattresses with no confirmed Queen price (priceUsd null - Helix's price
// is JS-rendered and couldn't be captured, some Leesa sizes only have a
// "from" price) are correctly excluded by the budget filter rather than
// silently treated as "fits" - see filterCatalog()'s null-price handling
// in lib/matchLogic.js.
//
// This page calls the actual scoreEngine fresh on every request via the
// same matchProfile() the real quiz flow uses - one implementation,
// always current, never a stale copy that could drift from the real
// engine.
const DEMO_PROFILE = {
  sleepPosition: 'side',
  weightLb: 155,
  preferredFirmnessLabel: 'medium-firm',
  sleepTemperature: 'hot',
  motionSensitivity: 'single',
  painFocus: [],
  mattressTypePreference: [],
  budgetUsd: { min: 0, max: 2000 },
};

export const metadata = {
  title: 'Best mattresses for side sleepers under $2,000 — Mattress Match Score',
};

export default async function ComparePage() {
  const { results, modelVersion, catalogAudit } = await matchProfile(DEMO_PROFILE);

  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true"><span /><span /><span /></div>
        <div className="wrap">
          <span className="eyebrow">Compare · Side sleepers under $2,000</span>
          <h1 className="ph-title">Best mattresses for side sleepers under $2,000</h1>
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
            <span className="eyebrow-dark" style={{ color: 'var(--teal-600,#0e8a72)', display: 'block', marginBottom: 14 }}>
              More comparisons
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 40 }}>
              <Link href="/compare/cooling-hybrids-for-couples" className="chip" style={{ textDecoration: 'none' }}>
                Cooling hybrids for couples
              </Link>
              <Link href="/compare/motion-isolation-for-couples" className="chip" style={{ textDecoration: 'none' }}>
                Motion isolation for couples
              </Link>
              <Link href="/compare/pressure-relief-for-side-sleepers" className="chip" style={{ textDecoration: 'none' }}>
                Pressure relief for side sleepers
              </Link>
              <Link href="/compare/back-support-for-heavier-sleepers" className="chip" style={{ textDecoration: 'none' }}>
                Back support for heavier sleepers
              </Link>
            </div>
          </div>

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
