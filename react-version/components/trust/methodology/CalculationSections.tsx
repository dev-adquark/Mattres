import { DIMENSIONS } from '@/lib/explain';
import { TIERS, DIMENSION_LEVELS } from '@/lib/scoreTiers';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { cssVars } from '@/components/ui/cssVars';
import type { ExampleProfile, MethodologySectionProps, WorkedExample } from '../methodologyTypes';
import { Chapter } from './Chapter';
import { firmnessLabel, fmt1 } from './format';
import s from '../Methodology.module.css';
import { TableScroll } from '@/components/ui/TableScroll';
import { PROVENANCE_LABEL } from '../provenanceCopy';

/* ---------- 06 Calculation ---------- */

function WorkedExampleTable({ ex }: { ex: WorkedExample }) {
  const adjustment = ex.scoreBreakdown.preferenceAdjustment;
  return (
    <TableScroll label="Score breakdown table">
      <table className={s.workTable}>
        <caption className="sr-only">{`Score breakdown for the ${ex.title}`}</caption>
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            <th scope="col">Sub-score</th>
            <th scope="col">Basis</th>
            <th scope="col">Weight</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((d) => {
            const sub = ex.subScores[d.id];
            const w = ex.effectiveWeights[d.id];
            const basis = ex.dimensionProvenance[d.id];
            return (
              <tr key={d.id}>
                <th scope="row">{d.label}</th>
                <td className="tabular">{fmt1(sub)}</td>
                <td>
                  <span className={s.basis} data-kind={basis}>
                    <span className={s.basisText}>{PROVENANCE_LABEL[basis] ?? 'Estimated'}</span>
                  </span>
                </td>
                <td className="tabular">{(w * 100).toFixed(1)}%</td>
                <td className="tabular">{(sub * w * 10).toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4}>Weighted total</th>
            <td className="tabular">{ex.scoreBreakdown.weightedSubScoreTotal.toFixed(1)}</td>
          </tr>
          <tr>
            <th scope="row" colSpan={4}>Preference penalty</th>
            <td className="tabular">{adjustment === 0 ? '0' : `−${Math.abs(adjustment).toFixed(1)}`}</td>
          </tr>
          <tr className={s.workTotal}>
            <th scope="row" colSpan={4}>Match Score</th>
            <td className="tabular">{ex.overallScore}</td>
          </tr>
        </tfoot>
      </table>
    </TableScroll>
  );
}

function WorkedExampleBlock({ ex, profile }: { ex: WorkedExample; profile: ExampleProfile }) {
  return (
    <div className={`split split--8-4 split--top ${s.worked}`}>
      <div>
        <h3 className="h3">Worked example: the real top match</h3>
        <p className="muted">
          A {profile.weightLb} lb {profile.sleepPosition} sleeper who likes a {firmnessLabel(profile.preferredFirmnessLabel).toLowerCase()} feel, sleeps
          hot, shares the bed with a light sleeper and has shoulder discomfort. The engine&apos;s number-one match for
          that profile today is the <strong>{ex.title}</strong>.
        </p>
        <WorkedExampleTable ex={ex} />
      </div>
      <aside className={s.workAside} aria-label="Result">
        <ScoreRing score={ex.overallScore} size="lg" showTier showDescription />
        <p className="small muted">
          {ex.riskFlagCount === 0
            ? 'No fit flags fired for this profile.'
            : `${ex.riskFlagCount} fit ${ex.riskFlagCount === 1 ? 'flag' : 'flags'} fired for this profile.`}{' '}
          Points are rounded for display; the total is the engine&apos;s own figure.
        </p>
        <Button href={`/mattress/${ex.id}`} variant="secondary" size="sm" arrow>
          See this mattress
        </Button>
      </aside>
    </div>
  );
}

export function CalculationSection({ data }: MethodologySectionProps) {
  const ex = data.example.match;
  const pf = data.rules.preferenceFit;
  return (
    <section id="calculation" className="section section--neutral" aria-labelledby="calculation-title">
      <div className="container">
        <header className="section__header">
          <Chapter index="06">The final calculation</Chapter>
          <h2 id="calculation-title" className="section__title">One line of arithmetic.</h2>
        </header>

        <div className={s.equation} role="group" aria-label="Match Score formula">
          <div className={s.eqTerm}>
            <span className={s.eqLabel}>Weighted total</span>
            <span className={s.eqBody}>
              each sub-score <span aria-hidden="true">×</span><span className="sr-only">times</span> its weight{' '}
              <span aria-hidden="true">×</span><span className="sr-only">times</span> 10, added up
            </span>
          </div>
          <span className={s.eqOp} aria-hidden="true">−</span>
          <span className="sr-only">minus</span>
          <div className={s.eqTerm}>
            <span className={s.eqLabel}>Preference penalty</span>
            <span className={s.eqBody}>
              {pf.pointsPerFirmnessPoint} per firmness point beyond {pf.tolerancePoints} from your preference, at most {pf.maxPenalty}
            </span>
          </div>
          <span className={s.eqOp} aria-hidden="true">=</span>
          <span className="sr-only">equals</span>
          <div className={`${s.eqTerm} ${s.eqResult}`}>
            <span className={s.eqLabel}>Match Score</span>
            <span className={s.eqBody}>rounded to a whole number, 0–100</span>
          </div>
        </div>

        {ex ? <WorkedExampleBlock ex={ex} profile={data.example.profile} /> : null}
      </div>
    </section>
  );
}

/* ---------- 07 Tiers ---------- */

export function TiersSection() {
  const ordered = [...TIERS].sort((a, b) => a.min - b.min);
  return (
    <section id="tiers" className="section section--editorial section--tight" aria-labelledby="tiers-title">
      <div className="container">
        <header className="section__header">
          <Chapter index="07">Score tiers</Chapter>
          <h2 id="tiers-title" className="section__title">What the number is called.</h2>
        </header>
        <div className={s.tierScale} aria-hidden="true">
          {ordered.map((t) => (
            <span key={t.id} className={s.tierSeg} data-tier={t.id} style={cssVars({ '--span': t.max - t.min + 1 })}>
              <span className={s.tierSegRange}>{t.min}</span>
            </span>
          ))}
          <span className={s.tierEnd}>100</span>
        </div>
        <ol className={`rule-list ${s.tierList}`}>
          {TIERS.map((t) => (
            <li key={t.id} data-tier={t.id}>
              <span className={s.tierRange}>
                {t.min}–{t.max}
              </span>
              <span className="h4">{t.label}</span>
              <span className="muted">{t.description}</span>
            </li>
          ))}
        </ol>
        <div className={s.levels}>
          <p className="h4">Sub-score words</p>
          <p className="small muted">The same idea for each 0–10 dimension.</p>
          <dl className={s.levelList}>
            {DIMENSION_LEVELS.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd className="tabular">{Number.isFinite(l.min) ? `${l.min} and up` : 'below 5.5'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
