'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { getDefaultLayers } from '@/components/three/layers';
import { DIMENSION_TO_LAYER } from '@/lib/categories';
import { DIMENSIONS } from '@/lib/explain';
import { track, EVENTS } from '@/lib/analytics';
import styles from './Inspect.module.css';

interface InspectLayer {
  id: string;
  label: string;
  description: string;
  /** Labels of the score dimensions this layer mostly drives (lib/categories DIMENSION_TO_LAYER). */
  dims: string[];
}

type LayerSource = 'button' | 'slider';

/**
 * Where each layer shows in the hybrid cutaway still (public/renders/cutaway-hybrid,
 * 1920x1080), as % of the frame: the dot sits on the layer's cut face and the
 * callout's leader runs straight up to the empty night above the bed (callouts
 * right of centre hang to the left of their leader so they never leave the frame).
 */
const ANCHORS: Record<string, { x: number; y: number; labelY: number }> = {
  cover: { x: 66, y: 36, labelY: 7 },
  comfort: { x: 36.5, y: 55.7, labelY: 7 },
  transition: { x: 30, y: 62.3, labelY: 7 },
  support: { x: 49.6, y: 66.7, labelY: 7 },
};

const LAYERS: InspectLayer[] = (
  getDefaultLayers('hybrid') as {
    id: string;
    label: string;
    description: string;
  }[]
).map((layer) => ({
  id: layer.id,
  label: layer.label,
  description: layer.description,
  dims: DIMENSIONS.filter((d) => DIMENSION_TO_LAYER[d.id] === layer.id).map((d) => d.label),
}));
const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * The interactive stage of chapter 04. The hero already separates the 3D
 * hybrid; here the same build is shown a different way: a cutaway still
 * (original render) bleeding off the right edge, with a numbered dot on each
 * layer's cut face and, for the selected layer, a leader line up to its name
 * and the score dimensions it mostly drives (lib/categories DIMENSION_TO_LAYER).
 * The rail steps cover -> comfort -> transition -> support with buttons or
 * arrow keys. Fires layer_explored {layer, source}.
 */
export function LayerInspector() {
  const [index, setIndex] = useState(1);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const layer = LAYERS[index] ?? LAYERS[0];

  const choose = (i: number, source: LayerSource, focus = false) => {
    const next = (i + LAYERS.length) % LAYERS.length;
    setIndex(next);
    const nextLayer = LAYERS[next];
    if (nextLayer) track(EVENTS.LAYER_EXPLORED, { layer: nextLayer.id, source });
    if (focus) buttons.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = i + 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = LAYERS.length - 1;
    if (next === null) return;
    e.preventDefault();
    choose(next, 'slider', true);
  };

  if (!layer) return null;

  return (
    <div className={`container container--wide ${styles.stage}`}>
      <div className={styles.viewer}>
        <div className={styles.cutaway} data-active={layer.id}>
          <MattressRender type="hybrid" aspect="cutaway" fill className={styles.cutawayImg} sizes="(min-width: 900px) 80vw, 140vw" />
          <svg className={styles.leaders} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {LAYERS.map((l) => {
              const a = ANCHORS[l.id];
              if (!a) return null;
              return <line key={l.id} x1={a.x} y1={a.y} x2={a.x} y2={a.labelY + 2} className={styles.leader} data-on={l.id === layer.id ? 'true' : undefined} vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          {LAYERS.map((l, i) => {
            const a = ANCHORS[l.id];
            if (!a) return null;
            const on = l.id === layer.id;
            return (
              <div key={l.id} aria-hidden="true">
                <span className={styles.dot} data-on={on ? 'true' : undefined} style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                  {pad(i + 1)}
                </span>
                <div className={styles.callout} data-on={on ? 'true' : undefined} data-side={a.x > 45 ? 'left' : undefined} style={{ left: `${a.x}%`, top: `${a.labelY}%` }}>
                  <span className={styles.calloutName}>{l.label}</span>
                  <span className={styles.chips}>
                    {(l.dims.length ? l.dims : ['Feel and finish']).map((d) => (
                      <span key={d} className={styles.chip}>
                        {d}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.rail}>
        <p className={styles.railTitle} id="inspect-rail-title">
          Layers, top to bottom
        </p>
        <ol className={styles.railList} aria-labelledby="inspect-rail-title">
          {LAYERS.map((l, i) => (
            <li key={l.id}>
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                className={styles.railButton}
                aria-pressed={i === index}
                tabIndex={i === index ? 0 : -1}
                onClick={() => choose(i, 'button')}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className={styles.railNo} aria-hidden="true">
                  {pad(i + 1)}
                </span>
                {l.label}
              </button>
            </li>
          ))}
        </ol>

        <div className={styles.detail} aria-live="polite">
          <p className={styles.detailText}>{layer.description}</p>
          <p className={styles.detailDims}>
            <span>Mostly drives</span> {layer.dims.length ? layer.dims.join(', ') : 'Feel and finish'}
          </p>
        </div>

        <div className={styles.railControls}>
          <span className={styles.railCount} aria-hidden="true">
            <strong>{pad(index + 1)}</strong> / {pad(LAYERS.length)}
          </span>
          <button type="button" className={styles.railArrow} onClick={() => choose(index - 1, 'slider')} aria-label="Previous layer">
            <ArrowLeft aria-hidden="true" />
          </button>
          <button type="button" className={styles.railArrow} onClick={() => choose(index + 1, 'slider')} aria-label="Next layer">
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className={styles.caption}>
        Illustration of a typical hybrid build, not a specific product. Use the arrow keys to move between layers.
      </p>
    </div>
  );
}
