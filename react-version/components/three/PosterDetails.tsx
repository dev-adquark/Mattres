/**
 * Surface details for MattressPoster: coil tops, latex pinholes and the
 * hero bedding (pillows + duvet). Pure SVG, server-renderable.
 */

import { MATTRESS_D as D, MATTRESS_W as W } from './sceneConfig';
import { pts, r2, shade, type PosterLayout, type PosterShape, type Pt } from './posterGeometry';

interface DetailProps {
  shape: PosterShape;
  layout: PosterLayout;
}

/** Coil tops on a coil core, plus coil columns seen through the front frame. */
export function PosterCoils({ shape: s, layout: { S, scale, elevation } }: DetailProps) {
  const xAt = (c: number) => -W / 2 + 0.3 + (c * (W - 0.6)) / 8;
  return (
    <g>
      {Array.from({ length: 9 }, (_, c) =>
        Array.from({ length: 12 }, (_, r) => {
          const z = s.cz - D / 2 + 0.3 + (r * (D - 0.6)) / 11;
          const [px, py] = S(xAt(c), s.cy + s.h / 2, z);
          return (
            <ellipse
              key={`${c}-${r}`}
              cx={px}
              cy={py}
              rx={r2(scale * 0.11)}
              ry={r2(scale * 0.11 * Math.sin(elevation) * 1.05)}
              fill="none"
              stroke="#c9ccd2"
              strokeWidth="1"
            />
          );
        }),
      )}
      {Array.from({ length: 9 }, (_, c) => {
        const a = S(xAt(c), s.cy + s.h / 2 - 0.03, s.cz + D / 2);
        const b = S(xAt(c), s.cy - s.h / 2 + 0.06, s.cz + D / 2);
        return (
          <line
            key={`col-${c}`}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke="rgba(201,204,210,0.4)"
            strokeWidth={r2(scale * 0.03)}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

/** Pinhole grid on a latex layer's top face. */
export function PosterPinholes({ shape: s, layout: { S, scale, elevation } }: DetailProps) {
  return (
    <g fill="rgba(120,100,60,0.35)">
      {Array.from({ length: 8 }, (_, c) =>
        Array.from({ length: 10 }, (_, r) => {
          const x = -W / 2 + 0.25 + (c * (W - 0.5)) / 7;
          const z = s.cz - D / 2 + 0.25 + (r * (D - 0.5)) / 9;
          const [px, py] = S(x, s.cy + s.h / 2, z);
          return <ellipse key={`${c}-${r}`} cx={px} cy={py} rx={r2(scale * 0.035)} ry={r2(scale * 0.035 * Math.sin(elevation))} />;
        }),
      )}
    </g>
  );
}

const DUVET = '#cbbda5';
const DUVET_BAND = '#d6cab4';

/** Soft vertical folds on a drape: deterministic, so server and client markup match. */
const foldAt = (t: number): number => Math.sin(t * 7.1 + 0.6) * 0.6 + Math.sin(t * 12.3 + 2.1) * 0.4;

/**
 * Two pillows at the head and a draped duvet over the foot of the assembled
 * hero bed: the same proportions as the WebGL bedding (rounded roll-over
 * edge, folds that grow towards a wavy hem, a turned-down band, a soft shade
 * on the border panel under the hem).
 */
export function PosterBedding({ layout: { S, scale, totalH }, uid }: { layout: PosterLayout; uid: string }) {
  const zc = -D / 2 + 0.52;
  const outline = (px: number, y: number, inset: number): Pt[] => [
    S(px - 0.6 + inset, y, zc - 0.32 + inset),
    S(px + 0.6 - inset, y, zc - 0.32 + inset),
    S(px + 0.6 - inset, y, zc + 0.32 - inset),
    S(px - 0.6 + inset, y, zc + 0.32 - inset),
  ];

  const hw = W / 2 + 0.012;
  const zF = D / 2 + 0.012;
  const zFold = zF - 1.85;
  const zBand = zFold + 0.5;
  const y0 = totalH + 0.03;
  const yB = y0 + 0.1;
  const rr = 0.06;
  const drop = Math.min(0.44, totalH * 0.74);
  const hemDepth = rr + (drop * 0.84 - (rr * Math.PI) / 2) + 0.048;
  const hemY = y0 - hemDepth;
  const N = 28;
  const range = (a: number, b: number, n = N) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

  // the rolled edge, then the hem, front (+z) and right (+x) faces
  const frontTop = range(-hw - rr * 0.6, hw).map((x) => S(x, y0 - rr * 0.35, zF + rr * 0.6));
  const frontHem = range(-hw - rr * 0.6, hw).map((x) => {
    const f = foldAt(x);
    return S(x, hemY + f * 0.012, zF + rr + f * 0.03);
  });
  const corner = range(0, Math.PI / 2, 6).map((a) => S(hw + Math.sin(a) * rr, hemY, zF + Math.cos(a) * rr));
  const sideTop = range(zF, zFold).map((z) => S(hw + rr * 0.6, y0 - rr * 0.35, z));
  const sideHem = range(zF, zFold).map((z) => {
    const f = foldAt(z + 1.3);
    return S(hw + rr + f * 0.03, hemY + f * 0.012, z);
  });
  const front = [...frontTop, S(hw + rr * 0.6, y0 - rr * 0.35, zF + rr * 0.6), ...[...corner].reverse(), ...[...frontHem].reverse()];
  const right = [S(hw + rr * 0.6, y0 - rr * 0.35, zF + rr * 0.6), ...sideTop, ...[...sideHem].reverse(), ...[...corner].reverse().slice(0, 4)];
  const top = [S(-hw, y0, zFold), S(hw, y0, zFold), S(hw, y0, zF), S(-hw, y0, zF)];
  const edgeLight = [S(-hw - rr * 0.4, y0 - rr * 0.1, zF + rr * 0.3), S(hw + rr * 0.3, y0 - rr * 0.1, zF + rr * 0.3), S(hw + rr * 0.3, y0 - rr * 0.1, zFold)];

  // folds: tapered valleys (wide at the hem, gone at the roll) with a lit ridge beside each
  const fold = (top: Pt, hem: Pt, w: number): { valley: Pt[]; ridge: Pt[] } => ({
    valley: [top, [r2(hem[0] - w), hem[1]], [r2(hem[0] + w), r2(hem[1] + w * 0.3)]],
    ridge: [[r2(top[0] + w * 0.6), top[1]], [r2(hem[0] + w), r2(hem[1] + w * 0.3)], [r2(hem[0] + w * 2.6), r2(hem[1] + w * 0.6)]],
  });
  const fw = r2(scale * 0.05);
  const folds = [
    ...[-1.1, -0.35, 0.55].map((x, i) => fold(S(x - 0.02, y0 - rr - 0.01 - i * 0.03, zF + rr), S(x + 0.03, hemY + foldAt(x) * 0.012, zF + rr), fw)),
    ...[1.55, 0.7].map((z, i) => fold(S(hw + rr, y0 - rr - 0.02 + i * 0.02, z - 0.02), S(hw + rr, hemY + foldAt(z + 1.3) * 0.012, z + 0.03), fw * 0.8)),
  ];

  // turned-down band: lies on the duvet, drapes a little further over the side
  const bandTop = [S(-hw - 0.03, yB, zFold), S(hw + 0.03, yB, zFold), S(hw + 0.03, yB, zBand), S(-hw - 0.03, yB, zBand)];
  const bandLip = [S(-hw - 0.03, yB, zBand), S(hw + 0.03, yB, zBand), S(hw + 0.03, y0 + 0.01, zBand + 0.04), S(-hw - 0.03, y0 + 0.01, zBand + 0.04)];
  const bandSide = [
    S(hw + 0.03, yB, zBand),
    S(hw + 0.03, yB, zFold),
    S(hw + rr + 0.02, hemY - 0.02, zFold + 0.02),
    S(hw + rr + 0.02, hemY - 0.02, zBand),
  ];
  const bandShadow = [S(-hw, y0, zBand + 0.04), S(hw, y0, zBand + 0.04), S(hw, y0, zBand + 0.2), S(-hw, y0, zBand + 0.2)];

  // contact shade on the border panel under the hem
  const shadeFront = [S(-W / 2, hemY, D / 2), S(W / 2, hemY, D / 2), S(W / 2, hemY - 0.16, D / 2), S(-W / 2, hemY - 0.16, D / 2)];
  const shadeSide = [S(W / 2, hemY, D / 2), S(W / 2, hemY, zFold + 0.1), S(W / 2, hemY - 0.16, zFold + 0.1), S(W / 2, hemY - 0.16, D / 2)];
  const [gx1, gy1] = S(W / 2, hemY, D / 2);
  const [gx2, gy2] = S(W / 2, hemY - 0.16, D / 2);
  const [fx1, fy1] = S(0, y0 - rr, zF + rr);
  const [fx2, fy2] = S(0, hemY, zF + rr);

  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-hem`} gradientUnits="userSpaceOnUse" x1={gx1} y1={gy1} x2={gx2} y2={gy2}>
          <stop offset="0" stopColor="rgba(0,0,0,0.55)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id={`${uid}-drape`} gradientUnits="userSpaceOnUse" x1={fx1} y1={fy1} x2={fx2} y2={fy2}>
          <stop offset="0" stopColor="rgba(255,248,236,0.10)" />
          <stop offset="0.75" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.16)" />
        </linearGradient>
      </defs>
      {[-0.68, 0.68].map((px) => (
        <g key={px} strokeLinejoin="round">
          <polygon points={pts(outline(px, totalH + 0.02, 0))} fill="#cfcbc3" stroke="#cfcbc3" strokeWidth={r2(scale * 0.1)} />
          <polygon points={pts(outline(px, totalH + 0.2, 0.1))} fill="#f4f1eb" stroke="#f4f1eb" strokeWidth={r2(scale * 0.2)} />
        </g>
      ))}
      <polygon points={pts(shadeFront)} fill={`url(#${uid}-hem)`} />
      <polygon points={pts(shadeSide)} fill={`url(#${uid}-hem)`} />
      <g strokeLinejoin="round">
        <polygon points={pts(right)} fill={shade(DUVET, 0.7)} stroke={shade(DUVET, 0.7)} strokeWidth="1" />
        <polygon points={pts(front)} fill={shade(DUVET, 0.9)} stroke={shade(DUVET, 0.9)} strokeWidth="1" />
        <polygon points={pts(front)} fill={`url(#${uid}-drape)`} />
        <polygon points={pts(top)} fill={DUVET} stroke={DUVET} strokeWidth={r2(scale * 0.06)} />
      </g>
      {folds.map(({ valley, ridge }, i) => (
        <g key={i}>
          <polygon points={pts(valley)} fill="rgba(60,48,32,0.11)" />
          <polygon points={pts(ridge)} fill="rgba(255,248,236,0.08)" />
        </g>
      ))}
      <polyline points={pts(edgeLight)} fill="none" stroke="rgba(255,246,230,0.3)" strokeWidth={r2(scale * 0.05)} strokeLinejoin="round" strokeLinecap="round" />
      <polygon points={pts(bandShadow)} fill="rgba(60,48,32,0.14)" />
      <g strokeLinejoin="round">
        <polygon points={pts(bandSide)} fill={shade(DUVET_BAND, 0.72)} stroke={shade(DUVET_BAND, 0.72)} strokeWidth="1" />
        <polygon points={pts(bandLip)} fill={shade(DUVET_BAND, 0.88)} />
        <polygon points={pts(bandTop)} fill={DUVET_BAND} stroke={DUVET_BAND} strokeWidth={r2(scale * 0.05)} />
      </g>
    </g>
  );
}
