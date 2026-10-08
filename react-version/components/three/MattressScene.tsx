'use client';

/**
 * MattressScene - the WebGL half of the 3D mattress system.
 *
 * Do not import this file directly from pages: use MattressViewer, which
 * lazy-loads it (next/dynamic, ssr:false) only when the viewer is near the
 * viewport, keeps an SVG poster in place until the first frame is drawn and
 * provides the accessible (non-WebGL) layer controls. This module and
 * ./scene/* are the ONLY places three.js is imported, so three ends up in its
 * own lazy chunk.
 *
 * React owns the lifecycle: the stage (scene/stage.ts) is created in an
 * effect keyed on what the scene is built from (StageConfig) and disposed on
 * unmount; every other prop reaches the running frame loop through a ref, so
 * selection, hover or explode changes never rebuild the scene.
 *
 *   scene/buildScene      SceneLoader: lighting, layers, bedding, floor, dust
 *   scene/layerViewer     the layer stack: separation, lift, dimming, edges
 *   scene/cameraController orbit rig, framing, focus dolly
 *   scene/lighting        3200K key, 7000K rim, indigo rim on dark sections
 *   scene/interaction     drag to orbit, hover / tap to pick a layer
 *   scene/explodeController x-ray reveal and scroll-linked separation
 *
 * Everything is procedural and an illustration of typical construction, not
 * a model of any specific product. Reduced motion: every change is instant.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { getDefaultLayers, normalizeMattressType } from './layers';
import { TONE_BACKGROUNDS, inferLayerMaterial } from './sceneConfig';
import { createStage } from './scene/stage';
import type { LiveSceneProps, StageApi } from './scene/types';
import type { ExplodeValue, LayerIdCallback, MattressLayer, RevealMode, SceneQuality, SceneVariant } from './types';
import styles from './MattressScene.module.css';

export interface MattressSceneProps {
  variant?: SceneVariant;
  /** Any catalog type string: hybrid | foam | latex | innerspring (normalised). */
  mattressType?: string;
  /** Default: getDefaultLayers(mattressType). */
  layers?: readonly MattressLayer[];
  /** 0..1, or 'scroll' to link it to scroll position. */
  explode?: ExplodeValue;
  /** X-ray: when a numeric explode first applies ('view' default for xray). */
  reveal?: RevealMode;
  /** Selected layer: lifts, amber edge, camera frames it. */
  activeLayerId?: string | null;
  /** Soft highlight (e.g. hovering an HTML control). */
  highlightLayerId?: string | null;
  /** Default true: the camera dollies to the active layer. False keeps the whole stack framed. */
  focusCamera?: boolean;
  onLayerHover?: LayerIdCallback;
  /** Canvas click/tap on a layer (null = empty space). */
  onLayerSelect?: LayerIdCallback;
  /** Camera finished moving to the active layer (null = overview). */
  onFocusSettled?: LayerIdCallback;
  /** X-ray separation started. */
  onRevealed?: () => void;
  autoRotate?: boolean;
  interactive?: boolean;
  quality?: SceneQuality;
  reducedMotion?: boolean;
  /** Default: hero variant on full quality. */
  particles?: boolean;
  /** Px covered by overlaid UI at the bottom; the framing shifts up by half. */
  framePadBottom?: number;
  /** Must match the surrounding section. */
  background?: string;
  /** First frame drawn. */
  onReady?: () => void;
  /** WebGL unavailable / context lost. */
  onError?: (err: Error) => void;
  className?: string;
}

export default function MattressScene({
  variant = 'hero',
  mattressType = 'hybrid',
  layers,
  explode,
  reveal,
  activeLayerId = null,
  highlightLayerId = null,
  focusCamera = true,
  onLayerHover,
  onLayerSelect,
  onFocusSettled,
  onRevealed,
  autoRotate = false,
  interactive = true,
  quality = 'full',
  reducedMotion = false,
  particles,
  framePadBottom = 0,
  background = TONE_BACKGROUNDS.dark,
  onReady,
  onError,
  className,
}: MattressSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<StageApi | null>(null);

  const type = normalizeMattressType(mattressType);
  const resolvedLayers = layers && layers.length ? layers : getDefaultLayers(type);
  const layersKey = resolvedLayers.map((l, i) => `${l.id}:${inferLayerMaterial(l, i, resolvedLayers.length, type)}`).join('|');
  const showParticles = (particles ?? variant === 'hero') && quality === 'full' && !reducedMotion;

  const liveProps: LiveSceneProps = {
    layers: resolvedLayers,
    explode,
    reveal: reveal ?? (variant === 'xray' ? 'view' : 'immediate'),
    activeLayerId,
    highlightLayerId,
    focusCamera,
    onLayerHover,
    onLayerSelect,
    onFocusSettled,
    onRevealed,
    autoRotate,
    interactive,
    reducedMotion,
    framePadBottom,
    onReady,
    onError,
  };
  const propsRef = useRef<LiveSceneProps>(liveProps);

  // Latest props for the imperative loop. Written in a layout effect (not during render).
  useLayoutEffect(() => {
    propsRef.current = liveProps;
    stageRef.current?.wake();
    stageRef.current?.sync();
  });

  // Rebuild only when the construction itself changes; everything else flows through propsRef.
  // layersKey stands in for the layers array (same ids + materials = same scene).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const stage = createStage(host, { variant, type, quality, background, showParticles }, () => propsRef.current);
    stageRef.current = stage;
    return () => {
      stageRef.current = null;
      stage?.dispose();
    };
  }, [variant, type, quality, layersKey, background, showParticles]);

  return <div ref={hostRef} className={`${styles.host}${className ? ` ${className}` : ''}`} />;
}
