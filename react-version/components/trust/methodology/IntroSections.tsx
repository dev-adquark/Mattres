import { Rail } from '@/components/ui/Rail';
import type { MethodologyRules, MethodologySectionProps, WeightRuleSummary } from '../methodologyTypes';
import { Chapter } from './Chapter';
import { TYPE_LABEL, firmnessLabel, multiplierText, pad2 } from './format';
import s from '../Methodology.module.css';

/* ---------- 01 Meaning ---------- */

const PROMISES = [
  { lead: 'Nobody can pay for a score.', text: "Brands can't buy a higher number, a better rank or a removed flag." },
  { lead: 'Gaps are shown, not hidden.', text: 'An estimated dimension is labeled as one, everywhere it appears.' },
  { lead: 'Every number traces to a rule.', text: 'The rules live in a versioned file, and every result carries a trace of the ones that fired.' },
] as const;

export function MeaningSection({ data }: MethodologySectionProps) {
  const ex = data.example.match;
  return (
    <section id="meaning" className="section section--editorial" aria-labelledby="meaning-title">
      <div className="container">
        <div className="split split--5-7 split--top">
          <div className={s.stickyHead}>
            <Chapter index="01">What the score means</Chapter>
            <h2 id="meaning-title" className={`display ${s.sectionStatement}`}>
              A fit score, <em>not a quality score.</em>
            </h2>
          </div>
          <div className={`stack ${s.meaningStack}`}>
            <div className="prose">
              <p>
                A Match Score from 0 to 100 says how well one mattress fits one sleep profile, based on the data we hold
                for it. It is not a verdict on the brand, a review, or a ranking of the best mattresses in the world.
              </p>
              <p>
                The same mattress earns a different score for a different sleeper, and that is the point. The same
                answers always give the same score: there is no randomness, no clock, and no hand-tuning per product.
              </p>
            </div>
            {ex ? (
              <figure className={s.contrast}>
                <figcaption className={s.contrastCaption}>
                  <span className="eyebrow eyebrow--plain">One mattress, three sleepers</span>
                  <span className="small muted">
                    The {ex.title} ({TYPE_LABEL[ex.type] || ex.type}), scored live by the engine for three different profiles.
                  </span>
                </figcaption>
                <ol className={s.contrastList}>
                  {ex.contrasts.map((c) => (
                    <li key={c.id}>
                      <span className={s.contrastScore} aria-hidden="true">{c.score}</span>
                      <span className={s.contrastLabel}>
                        <span className="sr-only">{`Match score ${c.score} out of 100 for a `}</span>
                        {c.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </figure>
            ) : null}
            <ul className={s.promises}>
              {PROMISES.map((p) => (
                <li key={p.lead}>
                  <strong>{p.lead}</strong> {p.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 02 Inputs ---------- */

type InputKey = 'sleepPosition' | 'weightLb' | 'preferredFirmnessLabel' | 'sleepTemperature' | 'motionSensitivity' | 'edgeImportance' | 'painFocus' | 'filters';

interface InputRow {
  key: InputKey;
  name: string;
  required: boolean;
  options: string;
  changes: string;
}

/** Rule-id prefix of the weight rules each quiz answer can trigger (straight from the rules file's naming). */
const RULE_PREFIX: Partial<Record<InputKey, string>> = {
  sleepPosition: 'WEIGHT_POSITION_',
  sleepTemperature: 'WEIGHT_TEMPERATURE_',
  motionSensitivity: 'WEIGHT_MOTION_',
  edgeImportance: 'WEIGHT_EDGE_',
  painFocus: 'WEIGHT_PAIN_',
};

/** Which weight rules a profile field triggers, as plain text, straight from the rules file. */
function rulesFor(weightRules: readonly WeightRuleSummary[], key: InputKey): WeightRuleSummary[] {
  if (key === 'weightLb') return weightRules.filter((r) => r.id === 'WEIGHT_HEAVIER_SLEEPER');
  const prefix = RULE_PREFIX[key];
  return prefix ? weightRules.filter((r) => r.id.startsWith(prefix)) : [];
}

function inputRows(rules: MethodologyRules): InputRow[] {
  const pf = rules.preferenceFit;
  return [
    { key: 'sleepPosition', name: 'Sleep position', required: true, options: 'Side, back, stomach or combination', changes: 'Sets your comfort firmness band. Side sleepers can trigger the pressure-point flag.' },
    { key: 'weightLb', name: 'Body weight', required: true, options: 'In pounds; grouped as under 130, 130–180, 180–230 and 230+', changes: 'Moves your comfort band firmer as weight rises. At 230 lb and up, durability counts for more and the sag flag can fire.' },
    {
      key: 'preferredFirmnessLabel',
      name: 'Firmness you like',
      required: true,
      options: Object.entries(rules.firmnessLabelScale).map(([k, v]) => `${firmnessLabel(k)} (${v})`).join(', '),
      changes: `Each firmness point beyond ${pf.tolerancePoints} away from your preference costs ${pf.pointsPerFirmnessPoint} points, up to ${pf.maxPenalty}.`,
    },
    { key: 'sleepTemperature', name: 'Sleep temperature', required: true, options: 'Cold, neutral or hot', changes: 'Hot sleepers can see the warm-sleeping flag.' },
    { key: 'motionSensitivity', name: 'Sharing the bed', required: false, options: 'Alone, with a sound sleeper, or with a light sleeper', changes: 'A light-sleeping partner turns on the motion-transfer flag.' },
    { key: 'edgeImportance', name: 'Edge support', required: false, options: 'Matters a little, somewhat or a lot', changes: 'Raises or lowers the bar for the soft-edge flag, or switches it off.' },
    { key: 'painFocus', name: 'Where you feel discomfort', required: false, options: 'Shoulders, hips, lower back, whole body or nowhere specific', changes: 'Shoulder or hip discomfort can trigger the pressure-point flag. It never diagnoses anything.' },
    {
      key: 'filters',
      name: 'Mattress type and budget',
      required: false,
      options: 'Foam, hybrid, innerspring, latex; a price range',
      changes:
        'Filters only: they decide which mattresses are scored, never the score itself. With a budget set, a mattress without a published price is left out rather than guessed.',
    },
  ];
}

export function InputsSection({ data }: MethodologySectionProps) {
  const { rules } = data;
  return (
    <section id="inputs" className="section section--linen" aria-labelledby="inputs-title">
      <div className="container">
        <header className="section__header section__header--split">
          <Chapter index="02">Answers that matter</Chapter>
          <h2 id="inputs-title" className="section__title">Eight answers. Each one has a job.</h2>
          <p className="section__intro">
            Four answers are required. The rest refine the result, and anything you skip simply applies no adjustment.
          </p>
        </header>
        <Rail as="ol" cards label="inputs" column="86%" align="start" className="rule-list rule-list--strong">
          {inputRows(rules).map((row, i) => {
            const modifiers = rulesFor(rules.weightRules, row.key);
            return (
              <li key={row.key} className={s.inputRow}>
                <span className={s.inputNum} aria-hidden="true">{pad2(i + 1)}</span>
                <div className={s.inputName}>
                  <h3 className="h4">{row.name}</h3>
                  <span className={s.inputReq}>{row.required ? 'Required' : 'Optional'}</span>
                </div>
                <p className={s.inputOptions}>{row.options}</p>
                <div className={s.inputEffect}>
                  <p>{row.changes}</p>
                  {modifiers.length ? (
                    <ul className={s.modList} aria-label={`Weight changes from ${row.name.toLowerCase()}`}>
                      {modifiers.map((m) => (
                        <li key={m.id}>
                          <span className={s.modWhen}>{m.description}</span>
                          <span className={s.modMult}>{multiplierText(m.multiply)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </Rail>
      </div>
    </section>
  );
}
