import type { MethodologySectionProps } from '../methodologyTypes';
import { FLAG_DOCS, NOTE_DOCS } from '../flagCopy';
import { Chapter, SeverityLabel } from './Chapter';
import s from '../Methodology.module.css';

/* ---------- 08 Flags ---------- */

export function FlagsSection({ data }: MethodologySectionProps) {
  const { rules } = data;
  return (
    <section id="flags" className="section section--linen" aria-labelledby="flags-title">
      <div className="container">
        <header className="section__header section__header--split">
          <Chapter index="08">Fit flags</Chapter>
          <h2 id="flags-title" className="section__title">What could be a problem, said plainly.</h2>
          <p className="section__intro">
            A flag doesn&apos;t lower the score. It sits beside it, so a strong match with one real trade-off still tells you
            about the trade-off. Each comes with something you can do about it.
          </p>
        </header>
        <ul className={s.flags}>
          {rules.riskFlagRules.map((rule) => {
            const doc = FLAG_DOCS[rule.code];
            if (!doc) return null;
            const worst = doc.severity[doc.severity.length - 1] ?? doc.severity[0];
            return (
              <li key={rule.code} className={s.flag} data-severity={worst}>
                <div className={s.flagHead}>
                  <h3 className="h4">{doc.title}</h3>
                  <span className={s.flagSevs}>
                    {doc.severity.map((sev) => (
                      <SeverityLabel key={sev} severity={sev} />
                    ))}
                  </span>
                </div>
                <dl className={s.flagBody}>
                  <div>
                    <dt>Fires when</dt>
                    <dd>{doc.when(rules.thresholds, rules.durability)}</dd>
                  </div>
                  <div>
                    <dt>How serious</dt>
                    <dd>{doc.severityText}</dd>
                  </div>
                  <div>
                    <dt>What to do</dt>
                    <dd>{rule.mitigation}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        <h3 className={`h4 ${s.notesTitle}`}>Notes that appear alongside flags</h3>
        <ul className={s.flags}>
          {NOTE_DOCS.map((n) => (
            <li key={n.id} className={s.flag} data-severity={n.severity}>
              <div className={s.flagHead}>
                <h4 className="h4">{n.title}</h4>
                <span className={s.flagSevs}>
                  <SeverityLabel severity={n.severity} />
                </span>
              </div>
              <p className={s.flagNote}>{n.when}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
