'use client';

/**
 * The x-ray's compact numbered layer tabs (01-04, name in Fraunces): a
 * roving-tabindex group of toggle buttons. Arrows / Home / End move and
 * select, Escape returns to the overview. They drive the same selection as
 * the canvas, so every layer is reachable without WebGL.
 */

import { useRef, type KeyboardEvent } from 'react';
import type { LayerIdCallback, MattressLayer } from './types';
import { pad2 } from './viewerUtils';
import styles from './MattressViewer.module.css';

interface XrayTabsProps {
  layers: readonly MattressLayer[];
  active: string | null;
  hovered: string | null;
  /** Accessible name of the group. */
  listTitle: string;
  groupId: string;
  /** Id of the detail panel the tabs control, when it is shown. */
  controlsId?: string;
  reducedMotion: boolean;
  onSelect: LayerIdCallback;
  onHover: LayerIdCallback;
}

export default function XrayTabs({ layers, active, hovered, listTitle, groupId, controlsId, reducedMotion, onSelect, onHover }: XrayTabsProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = layers.findIndex((l) => l.id === active);
  const rovingIndex = Math.max(0, activeIndex);

  const onKeyDown = (ev: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = layers.length;
    let next: number | null = null;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') next = (index + 1) % n;
    else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') next = (index - 1 + n) % n;
    else if (ev.key === 'Home') next = 0;
    else if (ev.key === 'End') next = n - 1;
    else if (ev.key === 'Escape' && active) {
      ev.preventDefault();
      onSelect(null);
      return;
    }
    const target = next === null ? undefined : layers[next];
    if (next === null || !target) return;
    ev.preventDefault();
    const btn = buttonsRef.current[next];
    btn?.focus();
    btn?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    onSelect(target.id);
  };

  return (
    <div className={styles.tabsWrap}>
      <p className={styles.srOnly} id={`${groupId}-title`}>
        {listTitle}
      </p>
      <div className={styles.tabs} role="group" aria-labelledby={`${groupId}-title`}>
        {layers.map((l, i) => {
          const isActive = l.id === active;
          return (
            <button
              key={l.id}
              ref={(el) => {
                buttonsRef.current[i] = el;
              }}
              type="button"
              className={`${styles.tab} ${isActive ? styles.tabActive : ''} ${l.id === hovered ? styles.tabHovered : ''}`}
              aria-pressed={isActive}
              aria-controls={controlsId}
              tabIndex={i === rovingIndex ? 0 : -1}
              onClick={() => onSelect(isActive ? null : l.id)}
              onKeyDown={(ev) => onKeyDown(ev, i)}
              onMouseEnter={() => onHover(l.id)}
              onMouseLeave={() => onHover(null)}
            >
              <span className={styles.tabIndex} aria-hidden="true">
                {pad2(i + 1)}
              </span>
              <span className={styles.tabLabel}>{l.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
