'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScoreCategory } from '@/lib/types';
import type { HomeAnatomy } from './types';
import styles from './Match.module.css';

const R = 84;
const C = 2 * Math.PI * R;
const GAP = 2.4;
const pct = (w: number): number => Math.round(w * 1000) / 10;

/**
 * What the score means (inside chapter 03). A segmented ring whose arcs are
 * the real v0.2 weights (computeEffectiveWeights, server-side), with presets
 * that show how answers re-weight the six dimensions. The list beside it
 * carries every number as text, so the ring is decorative support.
 */
export function ScoreAnatomy({ anatomy }: { anatomy: HomeAnatomy }) {
  const { dimensions, presets, preference, tiers } = anatomy;
  const [presetId, setPresetId] = useState<string | undefined>(presets[0]?.id);
  const [hover, setHover] = useState<ScoreCategory | null>(null);
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];
  if (!preset) return null;
  const defaults = presets[0]?.weights ?? preset.weights;
  const defaultId = presets[0]?.id;
  const fairMin = tiers.find((x) => x.id === 'fair')?.min ?? 60;

  const arcs = dimensions.map((d, i) => {
    const len = preset.weights[d.id] * C;
    const start = dimensions.slice(0, i).reduce((sum, prev) => sum + preset.weights[prev.id] * C, 0);
    return { id: d.id, len: Math.max(0, len - GAP), offset: -start };
  });
  const active = hover ? (dimensions.find((d) => d.id === hover) ?? null) : null;

  return (
    <div className={styles.anatomy}>
      <div className={styles.anatomyHead}>
        <h3 id="score-title" className={styles.anatomyTitle}>
          One number. <em>Six reasons</em> behind it.
        </h3>
        <p className={styles.anatomyLead}>
          Every score out of 100 is a weighted blend of six dimensions, minus a capped penalty when the feel misses your
          preference. Your answers move the weights.
        </p>
      </div>

      <div className={styles.presetBar}>
        <p className={styles.presetLabel} id="score-presets-label">
          See the weights for
        </p>
        <div className={styles.presetChips} role="group" aria-labelledby="score-presets-label">
          {presets.map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={p.id === presetId} onClick={() => setPresetId(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.anatomyBody}>
        <figure className={styles.ringFigure}>
          <svg viewBox="0 0 200 200" className={styles.ring} aria-hidden="true">
            <circle cx="100" cy="100" r={R} className={styles.ringTrack} />
            <g transform="rotate(-90 100 100)">
              {arcs.map((a) => (
                <circle
                  key={a.id}
                  cx="100"
                  cy="100"
                  r={R}
                  className={styles.ringArc}
                  data-active={hover === a.id ? 'true' : undefined}
                  data-dim={a.id}
                  style={{ strokeDasharray: `${a.len} ${C}`, strokeDashoffset: a.offset }}
                />
              ))}
              <circle
                cx="100"
                cy="100"
                r={R - 14}
                className={styles.ringPenalty}
                style={{ strokeDasharray: `${(preference.maxPenalty / 100) * 2 * Math.PI * (R - 14)} ${C}` }}
              />
            </g>
          </svg>
          <div className={styles.ringCenter} aria-hidden="true">
            {active ? (
              <>
                <span className={styles.ringValue}>{pct(preset.weights[active.id])}%</span>
                <span className={styles.ringLabel}>{active.label}</span>
              </>
            ) : (
              <>
                <span className={styles.ringValue}>100</span>
                <span className={styles.ringLabel}>points, six dimensions</span>
              </>
            )}
          </div>
          <figcaption className="sr-only">
            Weights for {preset.label}: {dimensions.map((d) => `${d.label} ${pct(preset.weights[d.id])}%`).join(', ')}. Firmness
            preference penalty up to {preference.maxPenalty} points.
          </figcaption>
        </figure>

        <div>
          <p className="sr-only" aria-live="polite">
            Showing weights for {preset.label.toLowerCase()}.
          </p>
          <ol className={styles.weightList}>
            {dimensions.map((d) => {
              const w = preset.weights[d.id];
              const delta = pct(w) - pct(defaults[d.id]);
              return (
                <li
                  key={d.id}
                  className={styles.weightRow}
                  data-active={hover === d.id ? 'true' : undefined}
                  onMouseEnter={() => setHover(d.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className={styles.swatch} data-dim={d.id} aria-hidden="true" />
                  <span className={styles.weightName}>{d.label}</span>
                  <span className={styles.weightValue}>{pct(w)}%</span>
                  <span className={styles.weightDelta}>
                    {preset.id === defaultId || Math.abs(delta) < 0.05 ? '' : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} pts`}
                  </span>
                </li>
              );
            })}
            <li className={`${styles.weightRow} ${styles.weightPenalty}`}>
              <span className={styles.swatch} data-dim="penalty" aria-hidden="true" />
              <span className={styles.weightName}>Firmness compatibility</span>
              <span className={styles.weightValue}>−{preference.maxPenalty} max</span>
              <span className={styles.weightDelta}>
                {preference.perPoint} pts per firmness point beyond {preference.tolerance} of your preferred feel
              </span>
            </li>
          </ol>
        </div>
      </div>

      <div className={styles.tierStrip}>
        <p className={styles.presetLabel}>What the number means</p>
        <ol className={styles.tiers}>
          {tiers.map((t) => (
            <li key={t.id}>
              <span className="tabular">{t.id === 'weak' ? `< ${fairMin}` : `${t.min}+`}</span>
              <span>{t.label}</span>
            </li>
          ))}
        </ol>
        <Link href="/methodology" className={`link ${styles.anatomyLink}`}>
          How the score is built
        </Link>
      </div>
    </div>
  );
}
