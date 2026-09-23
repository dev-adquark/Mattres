import rules from '@/lib/rules/0.1.json';
import BrandMarquee from '@/components/BrandMarquee';
import SpotlightCard from '@/components/SpotlightCard';

// Same radar formula as the original project's static methodology page
// (reverse-engineered and verified against its exact points: r = weight
// fraction * 300, same center/angles/axis order as the live Match Score
// radar in ScoreMetrics.jsx) - but computed here from the real rules
// file's actual weights, not hardcoded percentage strings, so this stays
// correct if the weights ever change.
const RADAR_AXIS_ORDER = ['pressureRelief', 'support', 'heat', 'motion', 'edge', 'durability'];
const RADAR_ANGLES = [-90, -30, 30, 90, 150, 210];
const RADAR_CX = 110;
const RADAR_CY = 110;
const RADAR_SCALE = 300;

function weightRadarPoints() {
  return RADAR_AXIS_ORDER.map((cat, i) => {
    const r = rules.weights[cat] * RADAR_SCALE;
    const rad = (RADAR_ANGLES[i] * Math.PI) / 180;
    return `${(RADAR_CX + r * Math.cos(rad)).toFixed(1)},${(RADAR_CY + r * Math.sin(rad)).toFixed(1)}`;
  }).join(' ');
}

const CATEGORIES = [
  {
    key: 'pressureRelief',
    label: 'Pressure relief',
    desc: 'How well the surface cushions shoulders and hips relative to your body weight and sleep position.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7-4.4-9.5-8.8C.7 8.7 2.3 5 6 5c2 0 3.4 1 4 2.4C10.6 6 12 5 14 5c3.7 0 5.3 3.7 3.5 7.2C15 17.6 12 21 12 21Z" />
      </svg>
    ),
  },
  {
    key: 'support',
    label: 'Support & alignment',
    desc: 'Whether the mattress keeps your spine neutral given your weight band and preferred firmness.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20V10l8-6 8 6v10M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    key: 'heat',
    label: 'Heat & airflow',
    desc: 'Airflow and heat-trapping tendencies of the materials, weighted higher if you told us you sleep warm.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeDasharray="4 2" />
        <path d="M2 16c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeDasharray="4 2" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: 'motion',
    label: 'Motion isolation',
    desc: 'How much movement transfers across the surface — weighted higher for couples and light sleepers.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" />
      </svg>
    ),
  },
  {
    key: 'edge',
    label: 'Edge support',
    desc: 'Stability and sag risk when sitting or sleeping near the perimeter of the mattress.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
        <rect x="7" y="7" width="10" height="10" rx="1.5" opacity="0.4" />
      </svg>
    ),
  },
  {
    key: 'durability',
    label: 'Durability',
    desc: 'How well the mattress resists sagging over time, based on top foam density relative to your body weight.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="15" width="16" height="4" rx="1" />
        <rect x="4" y="9.5" width="16" height="4" rx="1" opacity="0.65" />
        <rect x="4" y="4" width="16" height="4" rx="1" opacity="0.4" />
      </svg>
    ),
  },
];

// Real risk-flag rules, ported verbatim from the actual rules engine's
// riskFlagRules (data/rules/0.1.json), not invented copy: the trigger
// and mitigation text below describe the real thresholds the scoring
// engine checks, in plain language.
const RISK_FLAGS = [
  {
    label: 'Support threshold mismatch',
    trigger: 'Firmness falls outside the comfort band for your weight and position.',
    mitigation: 'Consider a firmer or softer variant in the same line, or add a topper.',
  },
  {
    label: 'Heat retention likelihood',
    trigger: 'All-foam core with limited airflow, flagged for warm sleepers.',
    mitigation: 'Look for gel-infused foam, hybrid coils, or a cooling cover.',
  },
  {
    label: 'Edge support concern',
    trigger: 'Reinforced perimeter absent or rated low by verified reviewers.',
    mitigation: 'Fine for centered sleepers; worth weighing if you sit on the edge often.',
  },
  {
    label: 'Durability / sag risk',
    trigger: 'Low-density foam layers paired with above-average body weight.',
    mitigation: 'Check warranty sag thresholds and trial period before buying.',
  },
];

export const metadata = {
  title: 'How the Match Score works — Mattress Match Score',
};

export default function MethodologyPage() {
  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true"><span /><span /><span /></div>
        <div className="wrap">
          <span className="eyebrow">Methodology · Scoring model v{rules.version}</span>
          <h1 className="ph-title">How the Match Score works</h1>
          <p className="ph-sub">
            A transparent, rules-based model. Every recommendation ships with the inputs and thresholds that produced
            it — nothing is a black box.
          </p>
        </div>
      </header>

      <div className="wrap" style={{ padding: '26px 24px 0' }}>
        <BrandMarquee onLight />
      </div>

      <section className="section dot-grid-bg">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 40 }}>
            <span className="eyebrow-dark">The model</span>
            <h2>Six scoring categories</h2>
            <p>
              Your sleep profile is weighed against each category below. Weights shown are the real values the
              scoring engine uses — some shift slightly based on your sleep position and weight range.
            </p>
          </div>

          <div className="weight-radar-wrap">
            <div className="radar-wrap on-light">
              <svg className="radar-svg" viewBox="-40 -10 300 240" aria-hidden="true">
                <polygon className="radar-grid" points="110,80 136,95 136,125 110,140 84,125 84,95" />
                <polygon className="radar-grid" points="110,50 162,80 162,140 110,170 58,140 58,80" />
                <polygon className="radar-grid" points="110,20 187.9,65 187.9,155 110,200 32.1,155 32.1,65" />
                <line className="radar-axis" x1="110" y1="110" x2="110" y2="20" />
                <line className="radar-axis" x1="110" y1="110" x2="187.9" y2="65" />
                <line className="radar-axis" x1="110" y1="110" x2="187.9" y2="155" />
                <line className="radar-axis" x1="110" y1="110" x2="110" y2="200" />
                <line className="radar-axis" x1="110" y1="110" x2="32.1" y2="155" />
                <line className="radar-axis" x1="110" y1="110" x2="32.1" y2="65" />
                <polygon className="radar-fill" points={weightRadarPoints()} />
                <text className="radar-label" x="110" y="12" textAnchor="middle">
                  Pressure {Math.round(rules.weights.pressureRelief * 100)}%
                </text>
                <text className="radar-label" x="196" y="62" textAnchor="start">
                  Support {Math.round(rules.weights.support * 100)}%
                </text>
                <text className="radar-label" x="196" y="160" textAnchor="start">
                  Heat {Math.round(rules.weights.heat * 100)}%
                </text>
                <text className="radar-label" x="110" y="214" textAnchor="middle">
                  Motion {Math.round(rules.weights.motion * 100)}%
                </text>
                <text className="radar-label" x="24" y="160" textAnchor="end">
                  Edge {Math.round(rules.weights.edge * 100)}%
                </text>
                <text className="radar-label" x="24" y="62" textAnchor="end">
                  Durability {Math.round(rules.weights.durability * 100)}%
                </text>
              </svg>
            </div>
          </div>

          <div className="method-grid">
            {CATEGORIES.map((cat, i) => (
              <SpotlightCard as="div" onLight className="method-card reveal-up" key={cat.key} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="mc-top">
                  <span className="p-num" style={{ margin: 0 }}>
                    {cat.icon}
                  </span>
                  <span className="weight-badge">{Math.round(rules.weights[cat.key] * 100)}% weight</span>
                </div>
                <h4>{cat.label}</h4>
                <p>{cat.desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      <section className="section why dot-grid-bg on-dark" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="wrap">
          <div className="section-head" style={{ maxWidth: 680 }}>
            <span className="eyebrow-dark" style={{ color: 'var(--teal-400)' }}>
              From inputs to score
            </span>
            <h2 style={{ color: 'var(--ink)' }}>Four steps, no guesswork</h2>
          </div>
          <div className="flow-row">
            <div className="flow-step">
              <span className="flow-num">1</span>
              <h4>Sleep profile</h4>
              <p>Position, weight range, firmness preference, temperature and motion needs.</p>
            </div>
            <div className="flow-step">
              <span className="flow-num">2</span>
              <h4>Rule matching</h4>
              <p>Your inputs are matched against thresholds defined per mattress type and body-weight band.</p>
            </div>
            <div className="flow-step">
              <span className="flow-num">3</span>
              <h4>Category scoring</h4>
              <p>Each of the six categories is scored 0–10 using normalized spec and review data.</p>
            </div>
            <div className="flow-step">
              <span className="flow-num">4</span>
              <h4>Weighted total</h4>
              <p>Category scores are combined using the weights above into a single 0–100 Match Score.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 36 }}>
            <span className="eyebrow-dark">Guardrails</span>
            <h2>Risk flags</h2>
            <p>Flags surface mismatches a plain star rating would hide — each one names the trigger and a mitigation.</p>
          </div>
          <div className="flag-table">
            <div className="flag-row flag-row-head">
              <span>Flag</span>
              <span>Typical trigger</span>
              <span>Mitigation</span>
            </div>
            {RISK_FLAGS.map((flag) => (
              <div className="flag-row" key={flag.label}>
                <span className="flag flag-warn">{flag.label}</span>
                <span>{flag.trigger}</span>
                <span>{flag.mitigation}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap two-col">
          <div>
            <span className="eyebrow-dark">Data quality</span>
            <h2 style={{ fontSize: 24, margin: '8px 0 14px' }}>Data sources &amp; confidence</h2>
            <p style={{ color: 'var(--slate-600)', fontSize: 14.5, lineHeight: 1.7 }}>
              Specs and review themes are normalized into structured tags (e.g. &ldquo;sleeps hot&rdquo;,
              &ldquo;great edge support&rdquo;) and each mattress carries a confidence rating based on how much
              verified data backs it.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <span className="conf conf-high">High confidence</span>
              <span className="conf conf-med">Medium confidence</span>
              <span className="conf conf-low">Low confidence</span>
            </div>
          </div>
          <div className="version-box">
            <h4>Version history</h4>
            <div className="version-row">
              <b>v{rules.version}</b>
              <span>Current</span>
              <p>{rules.description}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
