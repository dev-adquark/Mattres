'use client';

/**
 * MattressViewer - the public entry point for the 3D mattress illustration.
 *
 *   import MattressViewer from '@/components/three/MattressViewer';
 *
 * - Renders the SVG poster (MattressPoster) immediately, at the exact size
 *   the canvas will occupy, so there is no layout shift.
 * - Lazy-loads MattressScene (and with it three.js) via next/dynamic with
 *   ssr:false only once the viewer comes within ~300px of the viewport, and
 *   only on 'lite' / 'full' device tiers. 'static' keeps the poster.
 * - Fades the WebGL canvas in after its first frame; falls back to the
 *   poster for good if WebGL fails or the context is lost.
 * - Always renders an accessible alternative: an sr-only ordered list of
 *   layers (hero) or visible, keyboard-operable layer tabs (xray) that drive
 *   the selected layer, so everything is reachable without WebGL.
 *
 * X-ray layout: the canvas, then four compact numbered tabs (XrayTabs) and a
 * short detail (XrayDetail). Under 640px the canvas is 70vh and full-bleed,
 * with the tabs as a horizontal scroller directly below it (never over the model).
 */

import { useCallback, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceTier, useReducedMotion } from '@/lib/deviceTier';
import { EVENTS, track } from '@/lib/analytics';
import MattressPoster from './MattressPoster';
import SceneBoundary from './SceneBoundary';
import XrayDetail from './XrayDetail';
import XrayTabs from './XrayTabs';
import { getDefaultLayers, normalizeMattressType } from './layers';
import type { DimensionWeights } from './layerDrives';
import { TONE_BACKGROUNDS, defaultExplode } from './sceneConfig';
import type { ExplodeValue, LayerIdCallback, MattressLayer, RevealMode, SceneVariant, ViewerTone } from './types';
import { useCompactViewport, useNearViewport } from './viewerUtils';
import styles from './MattressViewer.module.css';

const MattressScene = dynamic(() => import('./MattressScene'), {
  ssr: false,
  loading: () => null,
});

export interface MattressViewerProps {
  variant?: SceneVariant;
  /** hybrid | foam | latex | innerspring (any catalog type string). */
  mattressType?: string;
  /** Default: getDefaultLayers(mattressType). */
  layers?: readonly MattressLayer[];
  /** 0..1 or 'scroll'. Default hero 0, xray 0.75. */
  explode?: ExplodeValue;
  /**
   * X-ray: 'view' (default) starts assembled and separates the layers (900ms,
   * ease-out-expo) once ~40% visible or a layer is chosen; 'immediate' shows them separated at once.
   */
  reveal?: RevealMode;
  /** Controlled selection (omit for uncontrolled). */
  activeLayerId?: string | null;
  defaultActiveLayerId?: string | null;
  /** Default true: the camera dollies to the active layer. False keeps the whole stack framed while the layer still lifts and glows. */
  focusCamera?: boolean;
  /** Fires for tabs, keyboard and canvas clicks. */
  onActiveLayerChange?: LayerIdCallback;
  onLayerHover?: LayerIdCallback;
  /** Camera has finished framing the active layer (null = overview). */
  onFocusSettled?: LayerIdCallback;
  /** Default: hero true, xray false (never with reduced motion). */
  autoRotate?: boolean;
  /** Drag-to-rotate + pointer picking. */
  interactive?: boolean;
  /** Section mood the viewer sits in. */
  tone?: ViewerTone;
  /** Override canvas/poster background colour. */
  background?: string;
  /** CSS aspect-ratio override. Default hero 16/10 (1/1 under 640px), xray 16/9 (70vh under 640px). */
  aspectRatio?: string;
  /** Hero: stage fills its positioned parent instead of using aspectRatio. */
  fill?: boolean;
  /** Accessible description of the illustration. */
  label?: string;
  /** Visible caption; false hides it (label still announces "illustration"). */
  caption?: string | false;
  /** Xray: accessible name of the layer tabs. */
  listTitle?: string;
  /**
   * Xray: show the explanation + "Drives" chips under the tabs. Default: true when uncontrolled,
   * false when the page controls `activeLayerId` (it usually renders its own panel).
   */
  details?: boolean;
  /** Xray: per layer id, components from the product's own published materials list. */
  layerMaterials?: Readonly<Record<string, readonly string[] | undefined>>;
  /** Xray: brand name for the materials line. */
  brand?: string;
  /** Xray: dimension weights for the chips (default: engine base weights). */
  weights?: DimensionWeights;
  /** Where a "Drives" chip links. */
  drivesHref?: string;
  /** Xray: optional link under the detail, e.g. to a product's own X-ray. */
  inspectHref?: string;
  inspectLabel?: string;
  /** Xray: full-bleed canvas under 640px. */
  bleed?: boolean;
  className?: string;
}

/** Runtime stage values, passed as custom properties (see MattressViewer.module.css). */
type StageVars = CSSProperties & { '--mv-stage-bg'?: string; '--mv-aspect'?: string };

export default function MattressViewer({
  variant = 'hero',
  mattressType = 'hybrid',
  layers,
  explode,
  reveal,
  activeLayerId,
  focusCamera = true,
  defaultActiveLayerId = null,
  onActiveLayerChange,
  onLayerHover,
  onFocusSettled,
  autoRotate,
  interactive = true,
  tone = 'dark',
  background,
  aspectRatio,
  fill = false,
  label,
  caption,
  listTitle = 'Layers, top to bottom',
  details,
  layerMaterials,
  brand,
  weights,
  drivesHref = '/methodology#weights',
  inspectHref,
  inspectLabel = 'Inspect a real mattress',
  bleed = true,
  className,
}: MattressViewerProps) {
  const type = normalizeMattressType(mattressType);
  const resolvedLayers = useMemo(() => (layers && layers.length ? layers : getDefaultLayers(type)), [layers, type]);
  const isXray = variant === 'xray';
  const tier = useDeviceTier();
  const reducedMotion = useReducedMotion();
  const compact = useCompactViewport();
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(stageRef);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [internalActive, setInternalActive] = useState<string | null>(defaultActiveLayerId);
  const [announce, setAnnounce] = useState('');
  const isControlled = activeLayerId !== undefined;
  const active = isControlled ? activeLayerId : internalActive;
  const showDetails = details ?? !isControlled;
  const lastTracked = useRef<string | null>(null);
  const uid = useId();

  const bg = background || TONE_BACKGROUNDS[tone] || TONE_BACKGROUNDS.dark;
  const use3D = tier !== 'static' && near && !failed;
  const typeLabel = type === 'foam' ? 'all-foam' : type;
  const altLabel =
    label || `Illustration of typical ${typeLabel} mattress construction${isXray ? ', shown with its layers separated' : ''}. Not a product photo.`;
  const captionText = caption === false ? null : caption || `Illustration of typical ${typeLabel} construction, not a photo of a specific product.`;

  const select = useCallback(
    (id: string | null) => {
      if (!isControlled) setInternalActive(id);
      onActiveLayerChange?.(id);
      const layer = resolvedLayers.find((l) => l.id === id);
      // A controlled parent owns the selection (it may refuse a change, e.g. Escape
      // when one layer must stay selected) and announces it itself.
      if (!isControlled) setAnnounce(layer ? `${layer.label} selected. ${layer.summary || layer.description}` : 'Showing all layers.');
      if (layer && lastTracked.current !== id) {
        lastTracked.current = id;
        try {
          track(EVENTS.LAYER_EXPLORED, { layer: layer.id, source: 'button', mattress_type: type, variant });
        } catch {
          /* analytics must never break the UI */
        }
      }
      if (!id) lastTracked.current = null;
    },
    [isControlled, onActiveLayerChange, resolvedLayers, type, variant],
  );

  const handleSceneSelect = useCallback(
    (id: string | null) => {
      if (!isXray && !id) return;
      select(id && id === active ? null : id);
    },
    [select, active, isXray],
  );
  const handleSceneHover = useCallback(
    (id: string | null) => {
      setHovered(id);
      onLayerHover?.(id);
    },
    [onLayerHover],
  );
  const handleReady = useCallback(() => setReady(true), []);
  const handleRevealed = useCallback(() => setRevealed(true), []);
  const handleError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  const activeIndex = resolvedLayers.findIndex((l) => l.id === active);
  const showAutoRotate = (autoRotate ?? !isXray) && !reducedMotion;
  const sceneExplode = explode ?? defaultExplode(variant);
  const sceneReveal: RevealMode = reveal ?? (isXray ? 'view' : 'immediate');
  // While WebGL is coming in for a gated x-ray, the poster matches the assembled first frame.
  // (Once the canvas is up the poster only fades out, so it stays assembled; if WebGL fails it shows the separated layers.)
  const posterExplode = isXray && use3D && sceneReveal === 'view' && explode !== 'scroll' && (!revealed || ready) && !active ? 0 : sceneExplode;
  const customAspect = !fill && !isXray && !!aspectRatio;
  const stageVars: StageVars = { '--mv-stage-bg': bg, ...(customAspect ? { '--mv-aspect': aspectRatio } : null) };
  const stageAspect = fill || isXray ? styles.fill : customAspect ? styles.aspectCustom : styles.aspectHero;

  const stage = (
    <div
      ref={stageRef}
      className={`${styles.stage} ${stageAspect}`}
      style={stageVars}
      role="img"
      aria-label={altLabel}
      data-tone={tone}
      data-tier={tier}
      data-state={failed ? 'fallback' : ready ? 'ready' : use3D ? 'loading' : 'poster'}
    >
      <div className={`${styles.poster} ${ready ? styles.posterHidden : ''}`}>
        <MattressPoster variant={variant} mattressType={type} layers={resolvedLayers} explode={posterExplode} activeLayerId={active} tone={tone} />
      </div>
      {use3D && (
        <div className={`${styles.canvasLayer} ${ready ? styles.canvasReady : ''}`} aria-hidden="true">
          <SceneBoundary onError={handleError}>
            <MattressScene
              variant={variant}
              mattressType={type}
              layers={resolvedLayers}
              explode={sceneExplode}
              reveal={sceneReveal}
              activeLayerId={active ?? null}
              highlightLayerId={hovered}
              focusCamera={focusCamera}
              onLayerHover={handleSceneHover}
              onLayerSelect={handleSceneSelect}
              onFocusSettled={onFocusSettled}
              onRevealed={handleRevealed}
              autoRotate={showAutoRotate}
              interactive={interactive}
              quality={tier === 'full' ? 'full' : 'lite'}
              reducedMotion={reducedMotion}
              background={bg}
              onReady={handleReady}
              onError={handleError}
            />
          </SceneBoundary>
        </div>
      )}
      {ready && interactive && (
        <p className={styles.hint} aria-hidden="true">
          <span className={styles.hintFine}>Drag to rotate{isXray ? ' · click a layer' : ''}</span>
          <span className={styles.hintCoarse}>Swipe sideways to rotate{isXray ? ' · tap a layer' : ''}</span>
        </p>
      )}
    </div>
  );

  if (!isXray) {
    return (
      <figure className={`${styles.viewer} ${fill ? styles.fill : ''} ${className || ''}`} data-variant="hero" data-tone={tone}>
        {stage}
        <ol className={styles.srOnly} aria-label={`${listTitle}: what each layer does`}>
          {resolvedLayers.map((l) => (
            <li key={l.id}>
              {l.label}: {l.description}
            </li>
          ))}
        </ol>
        {captionText && <figcaption className={styles.caption}>{captionText}</figcaption>}
      </figure>
    );
  }

  const detailId = `${uid}-detail`;
  const layer = resolvedLayers[activeIndex] ?? null;
  const xrayAspect = !!aspectRatio && !compact;
  const xrayVars: StageVars | undefined = xrayAspect ? { '--mv-aspect': aspectRatio } : undefined;

  return (
    <div
      className={`${styles.viewer} ${styles.xray} ${className || ''}`}
      data-variant="xray"
      data-tone={tone}
      data-bleed={bleed ? 'true' : undefined}
      data-active={layer ? layer.id : undefined}
    >
      <figure className={styles.xrayFigure}>
        <div className={`${styles.xrayStage} ${xrayAspect ? styles.xrayAspect : ''}`} style={xrayVars}>
          {stage}
        </div>
        <XrayTabs
          layers={resolvedLayers}
          active={active}
          hovered={hovered}
          listTitle={listTitle}
          groupId={`${uid}-layers`}
          controlsId={showDetails ? detailId : undefined}
          reducedMotion={reducedMotion}
          onSelect={select}
          onHover={setHovered}
        />
        {captionText && <figcaption className={styles.caption}>{captionText}</figcaption>}
      </figure>

      {showDetails ? (
        <XrayDetail
          id={detailId}
          layer={layer}
          index={activeIndex}
          total={resolvedLayers.length}
          layerMaterials={layerMaterials}
          brand={brand}
          weights={weights}
          drivesHref={drivesHref}
          inspectHref={inspectHref}
          inspectLabel={inspectLabel}
        />
      ) : null}
      <p className={styles.srOnly} aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
