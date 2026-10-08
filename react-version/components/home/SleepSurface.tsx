import { cx } from '@/components/ui/cx';
import type { SleepPosition } from '@/lib/types';
import type { BandLike, BandRange } from './types';
import styles from './SleepSurface.module.css';

export type SurfaceSize = 'glyph' | 'md' | 'lg';
export type Alignment = 'inside' | 'softer' | 'firmer';
type ZonePosition = Exclude<SleepPosition, 'combination'>;

interface Zone {
  id: string;
  /** Centre x. */
  x: number;
  /** Spread (sigma). */
  s: number;
  /** Relative load. */
  load: number;
}

/**
 * SleepSurface - the shared sleep-profile illustration (brief v3 s11-12).
 * A mattress cross-section with pressure zones where a sleeper's weight
 * concentrates. No human figure: the body is implied only by where the
 * surface gives and by a spine-alignment hairline.
 *
 * It is an ILLUSTRATION of how position, feel and body weight interact,
 * not measured pressure data. The one engine-derived input is `band`
 * (the comfort range the scoring rules use for this position); when given,
 * the hairline shows whether `firmness` sits inside it.
 *
 * Props are typed on SleepSurfaceProps below.
 *
 * Server-safe; pure SVG + CSS. The combination variant alternates two
 * patterns with a CSS animation that is off under reduced motion.
 */

const W = 600;
const TOP = 104; // resting surface line
const BASE = 196; // underside of the mattress
const LEFT = 24;
const RIGHT = 576;

// Zone layouts per position: centre x, spread (sigma), relative load.
const ZONES: Record<ZonePosition, Zone[]> = {
  side: [
    { id: 'shoulder', x: 214, s: 26, load: 1 },
    { id: 'hip', x: 372, s: 30, load: 1.12 },
  ],
  back: [
    { id: 'shoulder', x: 210, s: 48, load: 0.5 },
    { id: 'lumbar', x: 330, s: 86, load: 0.62 },
  ],
  stomach: [
    { id: 'chest', x: 220, s: 52, load: 0.42 },
    { id: 'hip', x: 370, s: 44, load: 0.98 },
  ],
};

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const bandOf = (band: BandLike | null | undefined): BandRange | null => {
  if (!band) return null;
  if ('min' in band) return typeof band.min === 'number' ? band : null;
  return { min: band[0], max: band[1] };
};

function surface(zones: Zone[], firmness: number, weightLb: number) {
  const softness = clamp((11 - firmness) / 9, 0.12, 1.1); // 1 = very soft
  const weight = clamp(weightLb / 170, 0.7, 1.55);
  const depthFor = (z: Zone): number => 40 * z.load * softness * weight;
  const yAt = (x: number): number => TOP + zones.reduce((sum, z) => sum + depthFor(z) * Math.exp(-((x - z.x) ** 2) / (2 * z.s ** 2)), 0);
  const pts: [number, number][] = [];
  for (let x = LEFT; x <= RIGHT; x += 6) pts.push([x, yAt(x)]);
  const top = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { top, yAt, depthFor, softness };
}

interface PatternProps {
  position: ZonePosition;
  firmness: number;
  weightLb: number;
  band: BandLike | null | undefined;
  size: SurfaceSize;
  uid: string;
}

/** Layer-line path for depth fraction t: deformation fades with depth, so deeper layers move less. */
function layerPath(t: number, yAt: (x: number) => number): string {
  const pts: string[] = [];
  for (let x = LEFT + 4; x <= RIGHT - 4; x += 12) {
    const y = TOP + (BASE - TOP) * t + (yAt(x) - TOP) * Math.max(0, 1 - t * 1.5);
    pts.push(`${pts.length ? 'L' : 'M'}${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

const COILS = Array.from({ length: 23 }, (_, i) => LEFT + 22 + i * 23.4);

function Pattern({ position, firmness, weightLb, band, size, uid }: PatternProps) {
  const zones = ZONES[position];
  const { top, yAt, depthFor } = surface(zones, firmness, weightLb);
  const b = bandOf(band);
  // Off-band direction: negative = softer than the range (sags), positive = firmer (presses).
  const off = b ? (firmness < b.min ? firmness - b.min : firmness > b.max ? firmness - b.max : 0) : 0;
  // Pressure concentrates more on a firmer surface (less give, smaller contact).
  const intensity = clamp(0.35 + (firmness - 1) / 12, 0.35, 1);
  const lineY = (x: number): number => yAt(x) - (size === 'glyph' ? 16 : 22);
  const first = zones[0] as Zone;
  const last = zones[zones.length - 1] as Zone;
  // Spine hairline through the two load points, tilted further by the off-band amount.
  const tilt = off * (position === 'side' ? 3.2 : 4.2);
  const x1 = 96;
  const x2 = 504;
  const ya = lineY(first.x);
  const yb = lineY(last.x) - tilt;
  const slope = (yb - ya) / (last.x - first.x);
  const y1 = ya + slope * (x1 - first.x);
  const y2 = ya + slope * (x2 - first.x);
  const aligned = b ? off === 0 : null;

  return (
    <g className={styles.pattern}>
      {/* Mattress body below the deformed surface. */}
      <path className={styles.body} d={`${top} L${RIGHT} ${BASE} Q${RIGHT} ${BASE + 8} ${RIGHT - 8} ${BASE + 8} L${LEFT + 8} ${BASE + 8} Q${LEFT} ${BASE + 8} ${LEFT} ${BASE} Z`} />
      {/* Heat: one radial glow per zone, sitting in the dip. */}
      {zones.map((z) => {
        const d = depthFor(z);
        return (
          <ellipse
            key={z.id}
            className={styles.heat}
            cx={z.x}
            cy={yAt(z.x) + 6}
            rx={z.s * 1.55}
            ry={Math.max(10, d * 0.9 + 10)}
            fill={`url(#${uid}-heat)`}
            opacity={clamp(intensity * z.load, 0.25, 1)}
          />
        );
      })}
      {/* Layer lines follow the surface, flattening with depth. */}
      {size !== 'glyph'
        ? [0.34, 0.58].map((t) => (
            <path key={t} className={styles.layerLine} d={layerPath(t, yAt)} />
          ))
        : null}
      {/* Support core: a row of coil hints. */}
      {size !== 'glyph'
        ? COILS.map((x) => (
            <line key={x} className={styles.coil} x1={x} x2={x} y1={BASE - 30} y2={BASE - 6} />
          ))
        : null}
      {/* Surface edge. */}
      <path className={styles.surface} d={top} />
      {/* Spine alignment hairline (cyan when inside the range, amber when not). */}
      <line className={styles.spine} data-aligned={aligned === false ? 'false' : 'true'} x1={x1} y1={y1} x2={x2} y2={y2} />
      {zones.map((z) => (
        <circle key={z.id} className={styles.node} data-aligned={aligned === false ? 'false' : 'true'} cx={z.x} cy={ya + slope * (z.x - first.x)} r={size === 'glyph' ? 6 : 4.5} />
      ))}
    </g>
  );
}

export function alignmentFor(firmness: number | null | undefined, band: BandLike | null | undefined): Alignment | null {
  const b = bandOf(band);
  if (!b || typeof firmness !== 'number') return null;
  if (firmness < b.min) return 'softer';
  if (firmness > b.max) return 'firmer';
  return 'inside';
}

interface SleepSurfaceProps {
  position?: SleepPosition;
  /** 1-10. */
  firmness?: number;
  /** Body weight driving sink depth. */
  weightLb?: number;
  /** Optional engine comfort range for this position. */
  band?: BandLike | null;
  size?: SurfaceSize;
  /** Accessible description; omit to make it decorative (aria-hidden). */
  label?: string;
  className?: string;
  /** Disambiguates gradient ids when two surfaces with the same props share a page. */
  idSeed?: string;
}

export function SleepSurface({ position = 'side', firmness = 5.5, weightLb = 170, band, size = 'md', label, className, idSeed }: SleepSurfaceProps) {
  // Deterministic gradient ids (identical on server and client); pass idSeed when two surfaces share a page with the same props.
  const uid = `ss-${idSeed || position}-${size}`;
  const a11y = label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true, focusable: 'false' } as const);
  const isCombo = position === 'combination';

  return (
    <svg viewBox={`0 0 ${W} 220`} className={cx(styles.svg, styles[size], className)} data-position={position} {...a11y}>
      <defs>
        <radialGradient id={`${uid}-heat`}>
          <stop offset="0%" stopColor="#F2B45A" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F2B45A" stopOpacity="0.5" />
          <stop offset="75%" stopColor="#D8CBB7" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D8CBB7" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x={LEFT} y={TOP - 60} width={RIGHT - LEFT} height={BASE - TOP + 70} rx="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        {isCombo ? (
          <>
            <g className={styles.comboA}>
              <Pattern position="side" firmness={firmness} weightLb={weightLb} band={band} size={size} uid={uid} />
            </g>
            <g className={styles.comboB}>
              <Pattern position="back" firmness={firmness} weightLb={weightLb} band={band} size={size} uid={uid} />
            </g>
          </>
        ) : (
          <Pattern position={position} firmness={firmness} weightLb={weightLb} band={band} size={size} uid={uid} />
        )}
      </g>
    </svg>
  );
}
