/**
 * MattressPoster - the static SVG twin of MattressScene.
 *
 * Drawn from the same 3D dimensions, layer order, palette and camera angle
 * (an orthographic projection of the scene's default view), so swapping
 * poster -> WebGL is visually seamless and the 'static' device tier still
 * gets a considered illustration rather than an empty box. Purely
 * decorative (aria-hidden); MattressViewer supplies the text alternative.
 *
 * No three.js and no client hooks: this renders on the server too.
 */

import { useId } from 'react';
import { cx } from '@/components/ui/cx';
import { getDefaultLayers, normalizeMattressType } from './layers';
import { VIEWBOX, layoutPoster, posterExplode, quiltLines, shade, r2, type PosterLayout, type PosterShape } from './posterGeometry';
import { PosterBedding, PosterCoils, PosterPinholes } from './PosterDetails';
import { PLATFORM_H } from './sceneConfig';
import type { ExplodeValue, MattressLayer, SceneVariant, ViewerTone } from './types';
import styles from './MattressPoster.module.css';

const HIGHLIGHT = '#f2b45a';
const HIGHLIGHT_LIGHT = '#b06f12';

export interface MattressPosterProps {
  variant?: SceneVariant;
  /** Any catalog type string (normalised). */
  mattressType?: string;
  layers?: readonly MattressLayer[];
  explode?: ExplodeValue;
  activeLayerId?: string | null;
  tone?: ViewerTone;
  className?: string;
}

interface ShapeProps {
  shape: PosterShape;
  layout: PosterLayout;
  uid: string;
  activeLayerId: string | null;
  dark: boolean;
}

function PosterLayerShape({ shape: s, layout, uid, activeLayerId, dark }: ShapeProps) {
  const { poly, S, exploded } = layout;
  const isActive = !!s.layerId && s.layerId === activeLayerId;
  const dim = exploded && !!activeLayerId && !!s.layerId && !isActive;
  const clipId = `${uid}-clip-${s.key}`;
  const frontFill = s.side ? shade(s.side, 1.0) : shade(s.fill, 0.8);
  const rightFill = s.side ? shade(s.side, 0.75) : shade(s.fill, 0.64);
  return (
    <g>
      <polygon points={poly(s.faces.front)} fill={frontFill} />
      <polygon points={poly(s.faces.right)} fill={rightFill} />
      <polygon points={poly(s.faces.top)} fill={s.fill} />

      {s.quilt && (
        <>
          <clipPath id={clipId}>
            <polygon points={poly(s.faces.top)} />
          </clipPath>
          <g clipPath={`url(#${clipId})`} stroke="rgba(70,60,48,0.2)" strokeWidth="1.1" strokeDasharray="3 2.5">
            {quiltLines(S, s.quiltY, s.quiltZ).map(([a, b], i) => (
              <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
            ))}
          </g>
          <polygon points={poly(s.faces.top)} fill="none" stroke="#1c1e24" strokeWidth="2.4" strokeLinejoin="round" />
        </>
      )}

      {(s.kind === 'pocket-coils' || s.kind === 'bonnell-coils') && <PosterCoils shape={s} layout={layout} />}
      {(s.kind === 'latex' || s.kind === 'latex-core') && <PosterPinholes shape={s} layout={layout} />}

      {dim && (
        <g fill={dark ? '#050b16' : '#e9e4da'} opacity="0.5">
          <polygon points={poly(s.faces.top)} />
          <polygon points={poly(s.faces.front)} />
          <polygon points={poly(s.faces.right)} />
        </g>
      )}

      {isActive && (
        <g fill="none" stroke={dark ? HIGHLIGHT : HIGHLIGHT_LIGHT} strokeWidth="1.5" strokeLinejoin="round">
          <polygon points={poly(s.faces.top)} />
          <polygon points={poly(s.faces.front)} />
          <polygon points={poly(s.faces.right)} />
        </g>
      )}
    </g>
  );
}

export default function MattressPoster({
  variant = 'hero',
  mattressType = 'hybrid',
  layers,
  explode,
  activeLayerId = null,
  tone = 'dark',
  className,
}: MattressPosterProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const type = normalizeMattressType(mattressType);
  const defs = layers && layers.length ? layers : getDefaultLayers(type);
  const layout = layoutPoster({ variant, type, layers: defs, explode: posterExplode(variant, explode), activeLayerId });
  const dark = tone !== 'light';
  const { S, scale, exploded } = layout;
  const bgGlow = dark ? 'rgba(216,203,183,0.10)' : 'rgba(255,255,255,0.7)';
  const centerBottom = S(0, variant === 'hero' ? -PLATFORM_H : -0.05, 0);

  return (
    <svg
      className={cx(styles.poster, className)}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${uid}-floor`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={bgGlow} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={`${uid}-contact`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={`${uid}-moon`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={dark ? 'rgba(233,228,218,0.08)' : 'rgba(255,255,255,0.5)'} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {variant === 'hero' && <ellipse cx={170} cy={110} rx={260} ry={200} fill={`url(#${uid}-moon)`} />}
      <ellipse cx={centerBottom[0]} cy={centerBottom[1]} rx={r2(scale * 4.2)} ry={r2(scale * 1.6)} fill={`url(#${uid}-floor)`} />
      <ellipse cx={centerBottom[0]} cy={r2(centerBottom[1] + 4)} rx={r2(scale * 2.6)} ry={r2(scale * 1.0)} fill={`url(#${uid}-contact)`} />

      {layout.shapes.map((s) => (
        <PosterLayerShape key={s.key} shape={s} layout={layout} uid={uid} activeLayerId={activeLayerId} dark={dark} />
      ))}

      {variant === 'hero' && !exploded && <PosterBedding layout={layout} uid={uid} />}
    </svg>
  );
}
