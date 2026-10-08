/**
 * Original line-art glyphs that fill the top of each sleep-position card.
 * Deliberately abstract (no human figure): a mattress cross-section with a
 * pillow, where the surface and layer lines dip where that position
 * concentrates weight, and an arrow marks where the weight lands.
 *   side        - two narrow, deep dips (shoulder and hip)
 *   back        - one long, shallow dip (weight spread evenly)
 *   stomach     - one dip toward the middle (hips sink)
 *   combination - the side and back profiles overlaid
 * Decorative: the option label carries the meaning (aria-hidden).
 */

import type { SleepPosition } from '@/lib/types';

interface Dip {
  /** Centre (viewBox x). */
  x: number;
  /** Width (gaussian spread). */
  w: number;
  /** Depth. */
  d: number;
}

const X0 = 46;
const X1 = 154;
/** Sleeping surface at rest; the body runs down to BOTTOM. */
const TOP = 46;
const BOTTOM = 100;

const PROFILES: Record<Exclude<SleepPosition, 'combination'>, readonly Dip[]> = {
  side: [
    { x: 74, w: 7, d: 13 },
    { x: 118, w: 8, d: 15 },
  ],
  back: [{ x: 98, w: 30, d: 8 }],
  stomach: [{ x: 108, w: 13, d: 13 }],
};

function surface(dips: readonly Dip[], y0: number, k: number): string {
  const pts: string[] = [];
  for (let x = X0; x <= X1; x += 2) {
    let y = y0;
    for (const dip of dips) y += dip.d * k * Math.exp(-(((x - dip.x) / dip.w) ** 2));
    pts.push(`${x},${y.toFixed(2)}`);
  }
  return `M6,${y0} L${X0},${y0} L${pts.join(' L')} L174,${y0}`;
}

/** Where the weight lands: a dot in each dip plus a short downward arrow above it. */
function markers(dips: readonly Dip[]) {
  return dips.map((d) => (
    <g key={d.x}>
      <circle cx={d.x} cy={TOP + d.d - 5} r="2.6" />
      <path d={`M${d.x} ${TOP - 24}v${12 + d.d * 0.3}m-3.2-3.4 3.2 3.4 3.2-3.4`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </g>
  ));
}

interface PositionGlyphProps {
  position: SleepPosition;
  className?: string;
}

export function PositionGlyph({ position, className }: PositionGlyphProps) {
  const combo = position === 'combination';
  const dips = position === 'combination' ? PROFILES.side : PROFILES[position];
  return (
    <svg className={className} viewBox="0 0 180 108" aria-hidden="true" focusable="false" fill="none">
      {/* pillow */}
      <path d="M10 45.5c0-6 3.2-9.5 10.5-9.5h13.5c6.5 0 9.5 3.5 9.5 9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      {/* mattress body */}
      <path d={`M6 ${TOP}v${BOTTOM - TOP - 4}a4 4 0 0 0 4 4h160a4 4 0 0 0 4-4V${TOP}`} stroke="currentColor" strokeWidth="1.1" opacity="0.35" />
      {/* layer lines compress less the deeper they sit */}
      <path d={surface(dips, 62, 0.5)} stroke="currentColor" strokeWidth="0.9" opacity="0.32" />
      <path d={surface(dips, 76, 0.22)} stroke="currentColor" strokeWidth="0.9" opacity="0.24" />
      <path d={surface(dips, 88, 0.08)} stroke="currentColor" strokeWidth="0.9" opacity="0.16" />
      {combo ? <path d={surface(PROFILES.back, TOP, 1)} stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 3" opacity="0.55" /> : null}
      {/* sleeping surface */}
      <path d={surface(dips, TOP, 1)} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <g data-glyph-marker fill="currentColor">{markers(dips)}</g>
      {combo ? (
        <path d="M166 14a9 9 0 1 1-6-8.4M160 2.5l0.6 3.6-3.6 0.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      ) : null}
    </svg>
  );
}
