import { Button } from '@/components/ui/Button';
import { cssVars } from '@/components/ui/cssVars';
import type { MethodologySectionProps, TopScoreStats } from '../methodologyTypes';
import { Chapter } from './Chapter';
import s from '../Methodology.module.css';

/* ---------- 12 Versions ---------- */

/** The strip plots the 50-100 range: no top match falls below 50. */
const STRIP_LO = 50;
const STRIP_HI = 100;
const STRIP_TICKS = [50, 60, 70, 80, 90, 100] as const;

function TopScoreStrip({ stats, label }: { stats: TopScoreStats; label: string }) {
  const maxCount = Math.max(...stats.distribution.map((d) => d.count));
  return (
    <div className={s.strip}>
      <p className={s.stripLabel}>
        <span className="h4">{label}</span>
        <span className="small muted">
          {stats.min === stats.max
            ? `Every top match scored ${stats.min}.`
            : `Top matches scored ${stats.min}–${stats.max} (${stats.distinctScores} different scores).`}
        </span>
      </p>
      <div className={s.stripPlot} aria-hidden="true">
        {stats.distribution.map((d) => (
          <span
            key={d.score}
            className={s.stripBar}
            style={cssVars({ '--x': Math.max(0, Math.min(1, (d.score - STRIP_LO) / (STRIP_HI - STRIP_LO))), '--h': d.count / maxCount })}
          />
        ))}
      </div>
    </div>
  );
}

export function VersionsSection({ data }: MethodologySectionProps) {
  const v = data.versions;
  const { rules } = data;
  return (
    <section id="versions" className="section section--editorial" aria-labelledby="versions-title">
      <div className="container">
        <header className="section__header">
          <Chapter index="12">Version history</Chapter>
          <h2 id="versions-title" className="section__title">Why the model changed.</h2>
          <p className="section__intro">
            Every version keeps its own rules file. Old versions stay available unchanged, so any past score can be
            reproduced.
          </p>
        </header>

        {v ? (
          <figure className={s.versionsFigure}>
            <figcaption className="small muted">
              The best score each of the same {v.profiles} test profiles received across the current catalog (4 positions × 4
              weights × 6 firmness preferences × 3 temperatures), computed for this page by both versions.
            </figcaption>
            <TopScoreStrip stats={v.v1} label="v0.1" />
            <TopScoreStrip stats={v.v2} label={`v${rules.version}`} />
            <div className={s.stripAxis} aria-hidden="true">
              {STRIP_TICKS.map((n) => (
                <span key={n} style={cssVars({ '--x': (n - STRIP_LO) / (STRIP_HI - STRIP_LO) })}>{n}</span>
              ))}
            </div>
          </figure>
        ) : null}

        <ol className={s.timeline}>
          <li className={s.release}>
            <div className={s.releaseHead}>
              <span className={s.releaseVer}>v{rules.version}</span>
              <span className={s.releaseMeta}>October 2026 · Current default</span>
            </div>
            <div className="prose">
              <p>
                <strong>Why:</strong> v0.1 couldn&apos;t tell mattresses apart.
                {v && v.v1.min === v.v1.max ? ` In the test above, every profile's top match scored exactly ${v.v1.min}.` : ''} It
                reduced real ratings to yes/no switches, leaned on a foam-density field no record has, and barely
                penalized a feel the sleeper said they didn&apos;t want.
              </p>
              <ul>
                <li>Uses the graded third-party ratings (out of 10) instead of yes/no switches.</li>
                <li>Marks any dimension without a rating as estimated, and caps estimates at {rules.estimateCap}.</li>
                <li>Grades firmness fit by distance from your comfort band instead of a flat penalty.</li>
                <li>Adds a graded preference penalty (up to {rules.preferenceFit.maxPenalty} points) for a feel far from what you asked for.</li>
                <li>Re-weights the six dimensions from your answers, including discomfort and edge support, which v0.1 collected but ignored.</li>
                <li>Adds two flags: &ldquo;A partner&apos;s movement may carry&rdquo; and &ldquo;Possible pressure points&rdquo;.</li>
              </ul>
            </div>
          </li>
          <li className={s.release}>
            <div className={s.releaseHead}>
              <span className={s.releaseVer}>v0.1</span>
              <span className={s.releaseMeta}>September 2026 · Retired as default, still reproducible</span>
            </div>
            <div className="prose">
              <p>
                The first rules-based model: construction-type baselines nudged by firmness and a few yes/no features
                (cooling cover, reinforced edge), fixed weights for everyone, and five flags. Its rules file is kept
                byte-for-byte, and the match API still accepts <code>scoreVersion: &quot;0.1&quot;</code>.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

/* ---------- Closing ---------- */

export function MethodologyClose() {
  return (
    <section className="section section--editorial section--ruled" aria-labelledby="close-title">
      <div className="container">
        <div className={s.closeInner}>
          <h2 id="close-title" className="display">
            See the arithmetic <em>on your own sleep.</em>
          </h2>
          <div className="cluster">
            <Button href="/find-match" size="lg" arrow magnetic>
              Find My Match
            </Button>
            <Button href="/disclosures" variant="ghost" size="lg">
              How we stay independent
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
