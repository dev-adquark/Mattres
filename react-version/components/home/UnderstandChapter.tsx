import type { ReactNode } from 'react';
import { Chapter } from '@/components/motion';
import { ContrastEvidence } from './ContrastEvidence';
import { FirmnessScale } from './FirmnessScale';
import { PersonalStory } from './PersonalStory';
import { cssVars } from '@/components/ui/cssVars';
import type { HomeContrast, HomePersonal } from './types';
import styles from './Home.module.css';

interface Panel {
  id: string;
  no: string;
  title: string;
  text: string;
  figure: ReactNode;
  /** Screen-reader text for figures that are otherwise decorative. */
  sr: string[] | null;
}

const fmt = (n: number): string => `${n}%`;
const coolingWidth = (n: number): string => `${Math.min(100, n * 2.4)}%`;

function buildPanels({ positionBands, weightBands, cooling }: HomePersonal): Panel[] {
  return [
    {
      id: 'position',
      no: 'i.',
      title: 'Your position sets the range.',
      text: 'Side sleepers need shoulders and hips to sink in; stomach sleepers need the hips held up. Each position gets its own comfort range on a 1–10 scale (here for 130–179 lb).',
      figure: <FirmnessScale compact rows={positionBands.map((p) => ({ id: p.id, label: p.label, band: p.band }))} />,
      sr: positionBands.map((p) => `${p.label}: ${p.band[0]} to ${p.band[1]} out of 10`),
    },
    {
      id: 'body',
      no: 'ii.',
      title: 'Your body moves it.',
      text: 'More weight compresses the comfort layers further, so the range a side sleeper needs climbs with body weight.',
      figure: <FirmnessScale compact rows={weightBands.map((b) => ({ id: b.key, label: b.label, band: b.side }))} />,
      sr: weightBands.map((b) => `Side sleeper, ${b.label}: ${b.side[0]} to ${b.side[1]} out of 10`),
    },
    {
      id: 'temperature',
      no: 'iii.',
      title: 'Your temperature reweights it.',
      text: `For a side sleeper, cooling counts for ${fmt(cooling.neutral)} of the score by default and ${fmt(cooling.hot)} once you tell us you run warm.`,
      figure: (
        <div className={styles.coolingFigure} aria-hidden="true">
          <div className={styles.coolingRow}>
            <span>Sleeps neutral</span>
            <span className={styles.coolingBar} style={cssVars({ '--w': coolingWidth(cooling.neutral) })} />
            <span className="tabular">{fmt(cooling.neutral)}</span>
          </div>
          <div className={styles.coolingRow} data-active="true">
            <span>Sleeps hot</span>
            <span className={styles.coolingBar} style={cssVars({ '--w': coolingWidth(cooling.hot) })} />
            <span className="tabular">{fmt(cooling.hot)}</span>
          </div>
        </div>
      ),
      sr: null,
    },
  ];
}

interface UnderstandChapterProps {
  contrast: HomeContrast | null;
  personal: HomePersonal;
}

/**
 * Chapter 02 - Understand (the problem + personalisation, merged).
 * Composition: full-width statement, then an inline data card with one
 * real engine result (the same mattress for two sleepers), then three
 * short "what moves the score" panels drawn from the v0.2 rules - a sticky
 * horizontal story on desktop (PersonalStory), a swipeable slider on small
 * screens and under reduced motion.
 */
export function UnderstandChapter({ contrast, personal }: UnderstandChapterProps) {
  const panels = buildPanels(personal);

  return (
    <section id="understand" className={`section--linen ${styles.understand}`} data-nav-theme="light" aria-labelledby="understand-title">
      <div className="container container--wide">
        <Chapter index={2} label="Understand" />
        <h2 id="understand-title" className={styles.statement}>
          Your mattress shouldn&rsquo;t be chosen by a <em>star rating</em> alone.
        </h2>

        <div className={styles.understandRow}>
          <div className={styles.understandText}>
            <p className={styles.understandLead}>
              A star rating averages thousands of bodies, positions and preferences into one number. It can&rsquo;t tell you
              whether a firm hybrid will hold a stomach sleeper level, or press into a side sleeper&rsquo;s shoulder.
            </p>
            <p className={styles.understandSub}>
              Fit depends on you. So we score each mattress against the way you sleep, not against everyone else.
            </p>
          </div>

          {contrast ? <ContrastEvidence contrast={contrast} /> : null}
        </div>

        <div className={styles.personal}>
          <PersonalStory
            label="What changes your Match Score"
            title={
              <h3 className={styles.personalTitle}>
                Three things move the answer <em>more than anything else.</em>
              </h3>
            }
            panels={panels.map((p) => (
              <article key={p.id} className={styles.panel}>
                <p className={styles.panelNo} aria-hidden="true">
                  {p.no}
                </p>
                <h4 className={styles.panelTitle}>{p.title}</h4>
                <p className={styles.panelText}>{p.text}</p>
                <div className={styles.panelFigure}>{p.figure}</div>
                {p.sr ? (
                  <ul className="sr-only">
                    {p.sr.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          />
        </div>
      </div>
    </section>
  );
}
