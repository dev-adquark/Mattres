import { DIMENSIONS } from '@/lib/explain';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { cssVars } from '@/components/ui/cssVars';
import type { MethodologySectionProps } from '../methodologyTypes';
import { pad2, pct } from './format';
import s from '../Methodology.module.css';

export interface ChapterDef {
  id: string;
  label: string;
}

/** The page's chapters, in order; each id is the section's anchor. */
export const CHAPTERS: readonly ChapterDef[] = [
  { id: 'meaning', label: 'What the score means' },
  { id: 'inputs', label: 'Answers that matter' },
  { id: 'dimensions', label: 'The six dimensions' },
  { id: 'weights', label: 'Weight explorer' },
  { id: 'sub-scores', label: 'How sub-scores work' },
  { id: 'calculation', label: 'The final calculation' },
  { id: 'tiers', label: 'Score tiers' },
  { id: 'flags', label: 'Fit flags' },
  { id: 'provenance', label: 'Data & sources' },
  { id: 'money', label: 'Money & placement' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'versions', label: 'Version history' },
];

/* ---------- 00 Hero ---------- */

export function MethodologyHero({ data }: MethodologySectionProps) {
  const { rules, catalog, money } = data;
  const facts = [
    { label: 'Mattresses scored', value: catalog.total },
    { label: 'Brands', value: catalog.brands },
    { label: 'Dimensions', value: DIMENSIONS.length },
    { label: 'Fit flags', value: rules.riskFlagRules.length },
    { label: 'Paid placements', value: money.sponsored },
  ];
  return (
    <section id="how-it-works" className={`section section--cinematic ${s.hero}`} data-nav-theme="dark" aria-labelledby="methodology-title">
      <div className="container">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'How it works', href: '/methodology' }]} className={s.heroCrumbs} />
        <div className={s.heroGrid}>
          <div className={s.heroCopy}>
            <p className="eyebrow">How the Match Score works · Model v{rules.version}</p>
            <h1 id="methodology-title" className={`display-xl ${s.heroTitle}`}>
              A score you can <em>take apart.</em>
            </h1>
            <p className={`lead ${s.heroLead}`}>
              Every Match Score is arithmetic you can follow: six sub-scores, weighted by your own answers, minus a
              penalty when the feel is far from what you asked for. No black box, no paid placement, and no claim of lab
              testing: we don&apos;t run one.
            </p>
          </div>
          <dl className={s.heroFacts}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className={s.split100}>
          <figcaption className={s.split100Caption}>
            <span className="eyebrow eyebrow--plain">Default weights</span>
            <span className="muted small">How 100 points divide before your answers move them.</span>
          </figcaption>
          <ol className={s.split100List}>
            {DIMENSIONS.map((d) => {
              const weight = rules.baseWeights[d.id];
              return (
                <li key={d.id} style={cssVars({ '--share': weight })}>
                  <span className={s.split100Pct}>{pct(weight)}</span>
                  <span className={s.split100Name}>{d.label}</span>
                  <span className={s.split100Bar} aria-hidden="true" />
                </li>
              );
            })}
          </ol>
        </figure>

        <nav aria-label="On this page" className={s.chapters}>
          <ol>
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className={s.chapterLink}>
                  <span className={s.chapterNum}>{pad2(i + 1)}</span>
                  <span>{c.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
