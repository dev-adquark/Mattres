'use client';

import type { Ref } from 'react';
import type { FirmnessLabel } from '@/lib/types';
import { FIRMNESS } from './quizModel';
import { cssVars } from '@/components/ui/cssVars';
import styles from './Quiz.module.css';

// How far the resting weight sinks for each firmness step (viewBox units).
const SINK = [30, 23, 17, 11, 6, 2] as const;
const UNSET_SINK = 14;
const SURFACE = 70;
const R = 26;

function surfacePath(depth: number, cx: number): string {
  const pts: string[] = [];
  for (let x = 0; x <= 600; x += 10) {
    const y = SURFACE + depth * Math.exp(-(((x - cx) / 70) ** 2));
    pts.push(`${x} ${y.toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

interface FirmnessSpectrumProps {
  value: FirmnessLabel | null;
  onChange: (next: FirmnessLabel) => void;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * Interactive firmness spectrum, SOFT - MEDIUM - FIRM. A native range input
 * (arrow keys, Home/End, drag) with a spoken value; the labels under it are
 * a pointer shortcut. Until the visitor interacts, the answer is unset
 * ("Not set yet") rather than silently defaulting to medium.
 * The cross-section above shows a resting weight sinking less as the
 * surface gets firmer (decorative; the text carries the meaning).
 */
export function FirmnessSpectrum({ value, onChange, labelledBy, describedBy, invalid, inputRef }: FirmnessSpectrumProps) {
  const index = FIRMNESS.findIndex((f) => f.value === value);
  const shown = index === -1 ? 2 : index;
  const current = index === -1 ? null : (FIRMNESS[index] ?? null);
  const depth = index === -1 ? UNSET_SINK : (SINK[index] ?? UNSET_SINK);
  // The weight sits above the slider thumb (thumb centre = 12px + (width - 24px) * t).
  const cx = 13 + (574 * shown) / (FIRMNESS.length - 1);
  const set = (i: number) => {
    const option = FIRMNESS[Math.max(0, Math.min(FIRMNESS.length - 1, i))];
    if (option) onChange(option.value);
  };

  return (
    <div className={styles.spectrum} data-unset={index === -1 ? '' : undefined}>
      <svg className={styles.spectrumArt} viewBox="0 0 600 150" aria-hidden="true" focusable="false">
        <rect x="0.5" y={SURFACE} width="599" height="79" className={styles.spectrumBody} />
        <path className={styles.spectrumLayer} d={surfacePath(depth * 0.45, cx)} transform="translate(0 24)" />
        <path className={styles.spectrumLayer} d={surfacePath(depth * 0.18, cx)} transform="translate(0 50)" />
        <path className={styles.spectrumSurface} d={surfacePath(depth, cx)} />
        <g className={styles.spectrumWeight} style={cssVars({ '--weight-x': `${cx - 300}px`, '--weight-y': `${depth}px` })}>
          <circle cx={300} cy={SURFACE - R} r={R} />
          <ellipse cx={292} cy={SURFACE - R - 9} rx="9" ry="5" className={styles.spectrumSheen} />
        </g>
      </svg>

      <div className={styles.spectrumControl}>
        {index === -1 ? <span className={styles.spectrumPulse} style={cssVars({ '--i': shown })} aria-hidden="true" /> : null}
        <input
          ref={inputRef}
          type="range"
          className={`range ${styles.spectrumRange}`}
          min={0}
          max={FIRMNESS.length - 1}
          step={1}
          value={shown}
          style={cssVars({ '--range-pct': `${(shown / (FIRMNESS.length - 1)) * 100}%` })}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-valuetext={current ? `${current.label}. ${current.desc}` : 'Not set yet'}
          onChange={(e) => set(Number(e.target.value))}
          onPointerUp={(e) => set(Number(e.currentTarget.value))}
        />
        <div className={styles.spectrumTicks} aria-hidden="true">
          {FIRMNESS.map((f, i) => (
            <button
              key={f.value}
              type="button"
              tabIndex={-1}
              className={styles.spectrumTick}
              data-active={i === index ? '' : undefined}
              style={cssVars({ '--i': i })}
              onClick={() => set(i)}
            >
              {f.short}
            </button>
          ))}
        </div>
        <div className={styles.spectrumPoles} aria-hidden="true">
          <span>Soft</span>
          <span>Medium</span>
          <span>Firm</span>
        </div>
      </div>

      <p className={styles.spectrumReadout} aria-hidden="true">
        {current ? (
          <>
            <strong>{current.label}</strong>
            <span>{current.desc}</span>
          </>
        ) : (
          <span>Drag the scale, tap a label, or use the arrow keys.</span>
        )}
      </p>
    </div>
  );
}
