import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';
import { mattressRender as s } from '@/components/ui/systemStyles';

type Point = readonly [number, number];
type PaletteKey = 'cover' | 'comfort' | 'transition' | 'support' | 'base' | 'coilBg' | 'coil' | 'latexA' | 'latexB';
type Palette = { name: string } & Record<PaletteKey, string>;
type LayerKind = 'cover' | 'foam' | 'coils' | 'latex' | 'base';
export type IllustratedType = 'foam' | 'hybrid' | 'innerspring' | 'latex';
export type RenderSize = 'sm' | 'md' | 'lg' | 'fluid';

export interface LayerDef {
  kind: LayerKind;
  name: string;
  share: number;
  color: PaletteKey;
}

export interface Layer extends LayerDef {
  fill: string;
  top: number;
  h: number;
}

/**
 * The isometric SVG mattress illustration (original, code-generated; never a
 * depiction of a specific brand's construction). Pure and hook-free, so it
 * renders on the server (MattressRender with aspect="illustration" or an
 * unknown type) and, loaded lazily, on the client as the fallback when a
 * render still fails to load (RenderStillImage).
 */

// Isometric geometry (viewBox units)
const VB_W = 330;
const VB_H = 282;
const U: Point = [0.866, 0.5]; // along the length, towards bottom-right
const V: Point = [0.866, -0.5]; // along the width, towards top-right
const LEN = 200;
const WID = 140;
const HEIGHT = 66;
const A: Point = [12, 106]; // front-left top corner

const add = (p: Point, q: Point, k = 1): Point => [p[0] + q[0] * k, p[1] + q[1] * k];
const B = add(A, U, LEN); // front-right top
const D = add(A, V, WID); // back-left top
const C = add(B, V, WID); // back-right top
const pts = (...ps: Point[]): string => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const down = (p: Point, y: number): Point => [p[0], p[1] + y];

const PALETTES: Palette[] = [
  { name: 'linen', cover: '#efe9de', comfort: '#d6e6e9', transition: '#bfd1d8', support: '#9db1c2', base: '#6c7d92', coilBg: '#29314d', coil: '#a9c8d8', latexA: '#efe3c4', latexB: '#e0cfa2' },
  { name: 'mist', cover: '#edf1f3', comfort: '#cde3e1', transition: '#b2cdcd', support: '#8ba8ae', base: '#5d7580', coilBg: '#243046', coil: '#9ad3d7', latexA: '#f0e6cb', latexB: '#ddd0a8' },
  { name: 'sand', cover: '#f4ede3', comfort: '#e6d8c4', transition: '#d0bfa8', support: '#b09f88', base: '#7b6e60', coilBg: '#2d2b39', coil: '#dac8aa', latexA: '#f2e6c8', latexB: '#e3d1a4' },
  { name: 'dusk', cover: '#ecebf3', comfort: '#d3d2ea', transition: '#b8b7d8', support: '#9897bf', base: '#686692', coilBg: '#262747', coil: '#bbbae8', latexA: '#efe4c8', latexB: '#ddcfa6' },
];

/** Generic, typical constructions. `kind` drives the texture. */
export const LAYER_STACKS: Record<IllustratedType, LayerDef[]> = {
  foam: [
    { kind: 'cover', name: 'Quilted knit cover', share: 0.13, color: 'cover' },
    { kind: 'foam', name: 'Comfort foam', share: 0.27, color: 'comfort' },
    { kind: 'foam', name: 'Transition foam', share: 0.2, color: 'transition' },
    { kind: 'foam', name: 'High-density support foam', share: 0.4, color: 'support' },
  ],
  hybrid: [
    { kind: 'cover', name: 'Quilted cover', share: 0.13, color: 'cover' },
    { kind: 'foam', name: 'Comfort foam', share: 0.2, color: 'comfort' },
    { kind: 'foam', name: 'Transition layer', share: 0.1, color: 'transition' },
    { kind: 'coils', name: 'Pocketed coil support', share: 0.47, color: 'coilBg' },
    { kind: 'base', name: 'Base foam', share: 0.1, color: 'base' },
  ],
  innerspring: [
    { kind: 'cover', name: 'Pillow-top cover', share: 0.2, color: 'cover' },
    { kind: 'foam', name: 'Comfort padding', share: 0.1, color: 'comfort' },
    { kind: 'coils', name: 'Innerspring coil unit', share: 0.58, color: 'coilBg' },
    { kind: 'base', name: 'Base layer', share: 0.12, color: 'base' },
  ],
  latex: [
    { kind: 'cover', name: 'Quilted cover', share: 0.13, color: 'cover' },
    { kind: 'latex', name: 'Comfort latex', share: 0.3, color: 'latexA' },
    { kind: 'latex', name: 'Support latex core', share: 0.57, color: 'latexB' },
  ],
};

export const TYPE_WORD: Record<IllustratedType, string> = { foam: 'foam', hybrid: 'hybrid', innerspring: 'innerspring', latex: 'latex' };

export function knownTypeOf(type: unknown): IllustratedType | null {
  return typeof type === 'string' && type in TYPE_WORD ? (type as IllustratedType) : null;
}

function hash(seed: unknown): number {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function paletteFor(seed: unknown): Palette {
  return PALETTES[hash(seed) % PALETTES.length] as Palette;
}

/** Layer stack with fills and vertical geometry (top, h in viewBox units). */
export function layersFor(type: string, seed: unknown): Layer[] {
  const palette = paletteFor(seed);
  const known = knownTypeOf(type);
  const stack = known ? LAYER_STACKS[known] : LAYER_STACKS.foam;
  return stack.map((l, i): Layer => {
    const top = stack.slice(0, i).reduce((sum, x) => sum + x.share * HEIGHT, 0);
    return { ...l, fill: palette[l.color], top, h: l.share * HEIGHT };
  });
}

interface FaceProps {
  origin: Point;
  dir: Point;
  length: number;
  top: number;
  h: number;
  face: 'front' | 'side';
}

function Coils({ origin, dir, length, top, h, color, spacing, face }: FaceProps & { color: string; spacing: number }) {
  const items: ReactNode[] = [];
  const count = Math.floor(length / spacing);
  const pad = (length - (count - 1) * spacing) / 2;
  const turns = 5;
  const amp = face === 'front' ? 3.6 : 3;
  for (let i = 0; i < count; i += 1) {
    const s = pad + i * spacing;
    const base = add(origin, dir, s);
    const y0 = base[1] + top + 2.5;
    const y1 = base[1] + top + h - 2.5;
    const step = (y1 - y0) / (turns * 2);
    const points: string[] = [];
    for (let k = 0; k <= turns * 2; k += 1) {
      const x = base[0] + (k % 2 === 0 ? -amp : amp);
      points.push(`${x.toFixed(1)},${(y0 + k * step).toFixed(1)}`);
    }
    items.push(<polyline key={i} points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round" />);
  }
  return <g opacity={face === 'front' ? 0.95 : 0.8}>{items}</g>;
}

function Pinholes({ origin, dir, length, top, h, face }: FaceProps) {
  const dots: ReactNode[] = [];
  const rows = Math.max(1, Math.floor(h / 9));
  const spacing = 11;
  const count = Math.floor(length / spacing);
  for (let r = 0; r < rows; r += 1) {
    for (let i = 0; i < count; i += 1) {
      const s = 6 + i * spacing + (r % 2 ? spacing / 2 : 0);
      if (s > length - 4) continue;
      const p = add(origin, dir, s);
      dots.push(<circle key={`${r}-${i}`} cx={p[0].toFixed(1)} cy={(p[1] + top + (r + 0.5) * (h / rows)).toFixed(1)} r="1.25" />);
    }
  }
  return <g fill="rgb(120 96 40 / 0.28)" opacity={face === 'front' ? 1 : 0.75}>{dots}</g>;
}

function Quilting({ palette }: { palette: Palette }) {
  // Diamond quilting on the top face: lines parallel to both iso axes.
  const lines: ReactNode[] = [];
  const stepL = LEN / 8;
  const stepW = WID / 5;
  for (let i = 1; i < 8; i += 1) {
    const p = add(A, U, i * stepL);
    const q = add(p, V, WID);
    lines.push(<line key={`l${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />);
  }
  for (let j = 1; j < 5; j += 1) {
    const p = add(A, V, j * stepW);
    const q = add(p, U, LEN);
    lines.push(<line key={`w${j}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />);
  }
  const tufts: ReactNode[] = [];
  for (let i = 1; i < 8; i += 1) {
    for (let j = 1; j < 5; j += 1) {
      const p = add(add(A, U, i * stepL), V, j * stepW);
      tufts.push(<circle key={`${i}-${j}`} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="1.3" />);
    }
  }
  return (
    <g aria-hidden="true">
      <g stroke="rgb(10 13 26 / 0.075)" strokeWidth="1" strokeDasharray="2.5 3">{lines}</g>
      <g fill={palette.name === 'sand' ? 'rgb(120 96 60 / 0.22)' : 'rgb(40 50 80 / 0.16)'}>{tufts}</g>
    </g>
  );
}

export interface IllustrationProps {
  type?: string | null;
  /** Use entry.id: picks a stable, brand-neutral palette per mattress. */
  seed?: string | null;
  size?: RenderSize;
  /** true = default caption; a string = custom caption. */
  caption?: boolean | string;
  /** Show the layer key. */
  legend?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function MattressIllustration({ type, seed, size = 'md', caption = false, legend = false, className, style }: IllustrationProps) {
  const knownType = knownTypeOf(type);
  const palette = paletteFor(seed || type);
  const layers = layersFor(knownType || 'foam', seed || type);
  const label = knownType
    ? `Illustration of a ${TYPE_WORD[knownType]} mattress — not a product photo`
    : 'Illustration of a mattress — not a product photo';

  const bands = layers.map((layer, i) => {
    const { top, h } = layer;
    const front = pts(down(A, top), down(B, top), down(B, top + h), down(A, top + h));
    const side = pts(down(B, top), down(C, top), down(C, top + h), down(B, top + h));
    return (
      <g key={i}>
        <polygon points={front} fill={layer.fill} />
        <polygon points={front} fill="rgb(10 13 26 / 0.05)" />
        <polygon points={side} fill={layer.fill} />
        <polygon points={side} fill="rgb(10 13 26 / 0.16)" />
        {layer.kind === 'coils' ? (
          <>
            <Coils origin={A} dir={U} length={LEN} top={top} h={h} color={palette.coil} spacing={12.5} face="front" />
            <Coils origin={B} dir={V} length={WID} top={top} h={h} color={palette.coil} spacing={12.5} face="side" />
          </>
        ) : null}
        {layer.kind === 'latex' ? (
          <>
            <Pinholes origin={A} dir={U} length={LEN} top={top} h={h} face="front" />
            <Pinholes origin={B} dir={V} length={WID} top={top} h={h} face="side" />
          </>
        ) : null}
        {i > 0 ? (
          <polyline points={pts(down(A, top), down(B, top), down(C, top))} fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth="0.9" />
        ) : null}
      </g>
    );
  });

  const coverH = (layers[0]?.share ?? 0) * HEIGHT;
  const outline = pts(A, D, C, down(C, HEIGHT), down(B, HEIGHT), down(A, HEIGHT));
  const shadowCenter = add(add(down(A, HEIGHT), U, LEN / 2), V, WID / 2);

  const svg = (
    <svg
      className={s.svg}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <ellipse cx={shadowCenter[0]} cy={shadowCenter[1] + 6} rx="168" ry="58" fill="rgb(10 13 26 / 0.06)" />
      <ellipse cx={shadowCenter[0]} cy={shadowCenter[1] + 4} rx="132" ry="40" fill="rgb(10 13 26 / 0.07)" />
      {bands}
      {/* Top face */}
      <polygon points={pts(A, B, C, D)} fill={palette.cover} />
      <Quilting palette={palette} />
      {/* Cover piping along the top edges */}
      <polyline points={pts(A, B, C)} fill="none" stroke="rgb(255 255 255 / 0.85)" strokeWidth="1.4" strokeLinejoin="round" />
      <polyline points={pts(down(A, coverH), down(B, coverH), down(C, coverH))} fill="none" stroke="rgb(10 13 26 / 0.14)" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={outline} fill="none" stroke="rgb(10 13 26 / 0.28)" strokeWidth="1.1" strokeLinejoin="round" />
      <line x1={B[0]} y1={B[1]} x2={B[0]} y2={B[1] + HEIGHT} stroke="rgb(10 13 26 / 0.18)" strokeWidth="1" />
    </svg>
  );

  const captionText = caption === true ? `Illustration of a typical ${knownType ? TYPE_WORD[knownType] : 'mattress'} construction — not a product photo.` : caption;

  return (
    <figure className={cx('mattress-render', s.render, size !== 'fluid' && s[size], className)} style={style} data-palette={palette.name}>
      {svg}
      {captionText ? <figcaption className={cx('mattress-render__caption', s.caption)}>{captionText}</figcaption> : null}
      {legend ? (
        <ul className={s.legend} aria-label="Illustrated layers, top to bottom">
          {layers.map((l, i) => (
            <li key={i}>
              <span className={s.swatch} style={{ background: l.fill }} aria-hidden="true" />
              {l.name}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
