'use client';

import { useId, useState } from 'react';
import type { CurvePoint, CurvePosition, CurveSeries } from './methodologyTypes';
import s from './FirmnessFitChart.module.css';
import { TableScroll } from '@/components/ui/TableScroll';

const POSITION_LABEL: Record<CurvePosition, string> = { side: 'Side', back: 'Back', stomach: 'Stomach', combination: 'Combination' };

const W = 640;
const H = 340;
const PAD = { top: 40, right: 112, bottom: 48, left: 40 } as const;
const X0 = 1;
const X1 = 10;
const GRID_VALUES = [0, 2.5, 5, 7.5, 10] as const;
const FIRMNESS_TICKS = Array.from({ length: 10 }, (_, i) => i + 1);

const x = (f: number): number => PAD.left + ((f - X0) / (X1 - X0)) * (W - PAD.left - PAD.right);
const y = (v: number): number => PAD.top + (1 - v / 10) * (H - PAD.top - PAD.bottom);

function path(points: readonly CurvePoint[], key: 'support' | 'pressureRelief'): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${x(p.firmness).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Label y-positions for the two line ends, nudged apart when the lines finish close together. */
function endLabelYs(last: CurvePoint): { ySupport: number; yPressure: number } {
  let ySupport = y(last.support) + 4;
  let yPressure = y(last.pressureRelief) + 4;
  if (Math.abs(ySupport - yPressure) < 16) {
    const mid = (ySupport + yPressure) / 2;
    const up = last.support >= last.pressureRelief;
    ySupport = mid + (up ? -8 : 8);
    yPressure = mid + (up ? 8 : -8);
  }
  return { ySupport, yPressure };
}

interface FirmnessFitChartProps {
  series: readonly CurveSeries[];
  weightLb: number;
}

/**
 * Support and pressure-relief sub-scores across the firmness scale, as the
 * engine computes them for a generic hybrid (series built server-side in
 * methodologyData.ts). The table under "Show the numbers" carries the same
 * data for screen readers and anyone who prefers figures.
 */
export function FirmnessFitChart({ series, weightLb }: FirmnessFitChartProps) {
  const [position, setPosition] = useState<CurvePosition>(series[0]?.position || 'side');
  const uid = useId();
  const current = series.find((item) => item.position === position) || series[0];
  if (!current) return null;
  const { band, points } = current;
  const last = points[points.length - 1];
  if (!last) return null;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const peakSupport = points.reduce((a, b) => (b.support > a.support ? b : a));
  const { ySupport, yPressure } = endLabelYs(last);

  return (
    <figure className={s.chart}>
      <fieldset className={`fieldset ${s.chartControls}`}>
        <legend>Sleep position ({weightLb} lb)</legend>
        <div className="segmented">
          {series.map((item) => (
            <label key={item.position}>
              <input
                type="radio"
                name={`${uid}-position`}
                value={item.position}
                checked={position === item.position}
                onChange={() => setPosition(item.position)}
              />
              <span>{POSITION_LABEL[item.position]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <svg viewBox={`0 0 ${W} ${H}`} className={s.chartSvg} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>{`Support and pressure relief by firmness for a ${weightLb} lb ${position} sleeper`}</title>
        <desc id={descId}>
          {`Comfort band ${fmt(band.min)} to ${fmt(band.max)} out of 10. Support peaks at ${fmt(peakSupport.support)} around firmness ${fmt(peakSupport.firmness)}. At firmness 10, support is ${fmt(last.support)} and pressure relief is ${fmt(last.pressureRelief)}.`}
        </desc>

        {GRID_VALUES.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={s.chartGrid} />
            <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" className={s.chartTick}>{v}</text>
          </g>
        ))}

        <rect
          x={x(band.min)}
          y={PAD.top}
          width={x(band.max) - x(band.min)}
          height={H - PAD.top - PAD.bottom}
          className={s.chartBand}
        />
        <text x={(x(band.min) + x(band.max)) / 2} y={PAD.top - 12} textAnchor="middle" className={s.chartBandLabel}>
          {`Comfort band ${fmt(band.min)}–${fmt(band.max)}`}
        </text>

        <path d={path(points, 'pressureRelief')} className={s.chartLinePressure} />
        <path d={path(points, 'support')} className={s.chartLineSupport} />

        <text x={x(last.firmness) + 10} y={ySupport} className={s.chartLabelSupport}>Support</text>
        <text x={x(last.firmness) + 10} y={yPressure} className={s.chartLabelPressure}>Pressure relief</text>

        {FIRMNESS_TICKS.map((f) => (
          <text key={f} x={x(f)} y={H - PAD.bottom + 20} textAnchor="middle" className={s.chartTick}>{f}</text>
        ))}
        <text x={PAD.left} y={H - 6} className={s.chartAxis}>← Softer</text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className={s.chartAxis}>Firmer →</text>
      </svg>

      <figcaption className={s.chartCaption}>
        Sub-scores out of 10 the engine gives a generic hybrid at each firmness. Solid line: support. Dashed line: pressure relief.
      </figcaption>

      <details className={s.chartTable}>
        <summary>Show the numbers</summary>
        <TableScroll label="Sub-scores by firmness table">
          <table>
            <caption className="sr-only">{`Sub-scores by firmness, ${position} sleeper, ${weightLb} lb`}</caption>
            <thead>
              <tr>
                <th scope="col">Firmness</th>
                <th scope="col">Support</th>
                <th scope="col">Pressure relief</th>
                <th scope="col">In comfort band</th>
              </tr>
            </thead>
            <tbody>
              {points.filter((p) => Number.isInteger(p.firmness)).map((p) => (
                <tr key={p.firmness}>
                  <th scope="row">{p.firmness}/10</th>
                  <td>{fmt(p.support)}</td>
                  <td>{fmt(p.pressureRelief)}</td>
                  <td>{p.firmness >= band.min && p.firmness <= band.max ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </details>
    </figure>
  );
}
