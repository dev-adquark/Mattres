import type { MattressType, ScoreCategory } from '@/lib/types';
import { DIMENSIONS } from '@/lib/explain';
import { cssVars } from '@/components/ui/cssVars';
import type { MethodologyRules, MethodologySectionProps } from '../methodologyTypes';
import { WeightExplorer } from '../WeightExplorer';
import { FirmnessFitChart } from '../FirmnessFitChart';
import { Chapter } from './Chapter';
import { TYPE_LABEL, fmt1, pad2, pct } from './format';
import s from '../Methodology.module.css';
import { TableScroll } from '@/components/ui/TableScroll';

/** Construction types in the order the rules text lists them. */
const RULE_TYPES: readonly MattressType[] = ['foam', 'latex', 'hybrid', 'innerspring'];
/** Construction types in the baseline table's order. */
const TABLE_TYPES: readonly MattressType[] = ['hybrid', 'foam', 'latex', 'innerspring'];
/** The dimension-weight bar is full at a 30% share. */
const WEIGHT_BAR_MAX = 0.3;

/** "all-foam +1, latex 0, ..." for a per-type modifier table from the rules file. */
function typeList(obj: Readonly<Record<string, number | undefined>>): string {
  return RULE_TYPES.map((t) => {
    const v = obj[t];
    return `${(TYPE_LABEL[t] || t).toLowerCase()} ${v !== undefined && v > 0 ? '+' : ''}${v}`;
  }).join(', ');
}

/** How each dimension's sub-score is produced, in words built from the rules file. */
function methodText(rules: MethodologyRules): Record<ScoreCategory, string> {
  const fit = rules.firmnessFit;
  return {
    support: `Calculated from the mattress's firmness on file (a number, or the brand's label converted to one) against your comfort band, then adjusted for construction (${typeList(fit.supportTypeModifier)}). Being too soft costs an extra ${fit.supportTooSoftExtraPerPoint} per point.`,
    pressureRelief: `Starts from a construction base (${typeList(fit.pressureTypeBase)}) and moves with where the firmness sits in your band: up to +${fit.pressureInBandBonusAtSoftEdge} near the soft edge, −${fit.pressureTooFirmPerPoint} for each point firmer than the band.`,
    heat: 'The independent cooling rating out of 10, used as published.',
    motion: 'The independent motion-isolation rating out of 10, used as published.',
    edge: 'The independent edge-support rating out of 10, used as published.',
    durability: `The independent durability rating out of 10, used as published. All-foam mattresses lose ${rules.durability.heavierSleeperFoamPenalty} point for sleepers ${rules.durability.heavierSleeperLb} lb and up.`,
  };
}

/* ---------- 03 Dimensions ---------- */

export function DimensionsSection({ data }: MethodologySectionProps) {
  const { rules, dimensionCoverage, catalog } = data;
  const method = methodText(rules);
  return (
    <section id="dimensions" className="section section--product" aria-labelledby="dimensions-title">
      <div className="container">
        <header className="section__header">
          <Chapter index="03">The six dimensions</Chapter>
          <h2 id="dimensions-title" className="section__title">Six things a mattress has to get right for you.</h2>
          <p className="section__intro">
            Each is scored from 0 to 10. The weight is its default share of the final score; the coverage line says how
            many of the {catalog.total} mattresses have data on file for it (we don&apos;t lab-test anything ourselves).
          </p>
        </header>
        <ol className="rule-list">
          {DIMENSIONS.map((d, i) => {
            const weight = rules.baseWeights[d.id];
            const measured = dimensionCoverage[d.id];
            return (
              <li key={d.id} className={s.dimRow}>
                <span className={s.dimNum} aria-hidden="true">{pad2(i + 1)}</span>
                <div className={s.dimTitle}>
                  <h3 className="h3">{d.label}</h3>
                  <p className="muted">{d.short}</p>
                </div>
                <div className={s.dimWeight}>
                  <span className={s.dimWeightNum}>{pct(weight)}</span>
                  <span className="xs muted">default weight</span>
                  <span className={s.dimWeightBar} style={cssVars({ '--w': weight / WEIGHT_BAR_MAX })} aria-hidden="true" />
                </div>
                <div className={s.dimMethod}>
                  <p className="small">{method[d.id]}</p>
                  <p className={s.dimCoverage}>
                    <span className={s.meter} aria-hidden="true">
                      <span style={cssVars({ '--w': catalog.total ? measured / catalog.total : 0 })} />
                    </span>
                    <span className="xs">
                      Backed by data for {measured} of {catalog.total}; estimated for {catalog.total - measured}
                    </span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- 04 Weight explorer ---------- */

export function WeightsSection({ data }: MethodologySectionProps) {
  const { explorer, rules } = data;
  return (
    <section id="weights" className="section section--deep" aria-labelledby="weights-title">
      <div className="container">
        <header className="section__header section__header--split">
          <Chapter index="04">Weight explorer</Chapter>
          <h2 id="weights-title" className="section__title">
            Your answers <em>reweight</em> the score.
          </h2>
          <p className="section__intro">
            Change the answers and watch the six shares move. Every combination was computed by the scoring
            engine&apos;s own weighting function, not re-implemented for this page.
          </p>
        </header>
        <WeightExplorer
          fields={explorer.fields}
          stride={explorer.stride}
          table={explorer.table}
          baseWeights={rules.baseWeights}
          weightRules={rules.weightRules}
        />
        <p className={`xs muted ${s.footnote}`}>
          How it works: each matching rule multiplies the default weight of the dimensions it names, then all six are
          divided by their total so they always add up to 100%. Percentages are rounded. Firmness preference doesn&apos;t
          change weights; it applies a separate penalty (chapter 06).
        </p>
      </div>
    </section>
  );
}

/* ---------- 05 Sub-scores ---------- */

function BaselineTable({ rules }: { rules: MethodologyRules }) {
  const cap = rules.estimateCap;
  return (
    <TableScroll label="Construction baselines table">
      <table className={s.baseline}>
        <caption className="sr-only">Construction baselines used for estimates</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            {DIMENSIONS.map((d) => (
              <th scope="col" key={d.id}>{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_TYPES.map((t) => (
            <tr key={t}>
              <th scope="row">{TYPE_LABEL[t]}</th>
              {DIMENSIONS.map((d) => {
                const raw = rules.typeBaselines[t]?.[d.id];
                const used = raw === undefined ? undefined : Math.min(raw, cap);
                return (
                  <td key={d.id} className="tabular">
                    {fmt1(used)}
                    {raw !== undefined && used !== raw ? <span className={s.capped}> (from {raw})</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function SubScoresSection({ data }: MethodologySectionProps) {
  const { rules, curves } = data;
  const cap = rules.estimateCap;
  return (
    <section id="sub-scores" className="section section--editorial" aria-labelledby="sub-scores-title">
      <div className="container">
        <header className="section__header">
          <Chapter index="05">How sub-scores work</Chapter>
          <h2 id="sub-scores-title" className="section__title">
            Sourced where we can. <em>Estimated where we must,</em> and labeled.
          </h2>
        </header>

        <div className={s.provPair}>
          <div className={s.provCol}>
            <p className={s.provTag} data-kind="measured">Sourced</p>
            <h3 className="h3">Data on file, with its source named</h3>
            <p>
              Cooling, motion isolation, edge support and durability use the independent review rating stored for that
              mattress, out of 10, as published. Support and pressure relief are calculated from the mattress&apos;s firmness
              on file: an independent firmness rating, the brand&apos;s stated number, or the brand&apos;s firmness label (such as
              &ldquo;Medium&rdquo;) converted to our 1 to 10 scale. Nothing here is a measurement we took: we don&apos;t lab-test
              mattresses, so we call these values sourced, and each one says where it came from.
            </p>
            <p className="small muted">Results pages show sourced bars as solid lines.</p>
          </div>
          <div className={s.provCol}>
            <p className={s.provTag} data-kind="estimated">Estimated</p>
            <h3 className="h3">No rating, so a capped assumption</h3>
            <p>
              When no rating exists, the engine falls back to a typical value for the construction type, and caps it at{' '}
              <strong>{cap}</strong>. {rules.estimateCapRationale.replace(/^An estimated \(unrated\) dimension is capped at 6\.5, /, 'That keeps it ')}
            </p>
            <p className="small muted">Results pages show estimated bars dashed, with the word &ldquo;Estimated&rdquo;.</p>
          </div>
        </div>

        <div className={s.baselineHead}>
          <h3 className="h4">Construction baselines used for estimates</h3>
          <p className="small muted">Out of 10, after the {cap} cap. The uncapped value is shown where the cap applies.</p>
        </div>
        <BaselineTable rules={rules} />

        <div className={`split split--4-8 split--top ${s.fitSplit}`}>
          <div className="stack">
            <h3 className="h3">Firmness fit, drawn by the engine</h3>
            <p>
              Your position and weight set a comfort band. Fit is best at the band&apos;s center, eases to{' '}
              {Math.round(rules.firmnessFit.insideEdgeFit * 100)}% at its edges, then drops{' '}
              {Math.round(rules.firmnessFit.outsidePerPointLoss * 100)} percentage points for every firmness point outside it.
            </p>
            <p className="muted small">
              Pick a position to see the band move. Softer than the band, pressure relief stays high but support drops
              away quickly; firmer than the band, both fall.
            </p>
          </div>
          <FirmnessFitChart series={curves.series} weightLb={curves.weightLb} />
        </div>
      </div>
    </section>
  );
}
