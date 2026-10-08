/**
 * The x-ray's detail panel for the selected layer: a two-line explanation,
 * an optional line from the product's own published materials list, and
 * "Drives" chips with the engine's weights linking to the methodology.
 * No hooks: renders wherever its parent does.
 */

import Link from 'next/link';
import { BASE_WEIGHTS, drivesFor, type DimensionWeights } from './layerDrives';
import type { MattressLayer } from './types';
import { pad2 } from './viewerUtils';
import styles from './MattressViewer.module.css';

export interface XrayDetailProps {
  id: string;
  layer: MattressLayer | null;
  /** Position of `layer` in the stack (0-based). */
  index: number;
  total: number;
  /** Per layer id, components from the product's own published materials list. */
  layerMaterials?: Readonly<Record<string, readonly string[] | undefined>>;
  brand?: string;
  /** Profile weights; the engine's base weights when omitted. */
  weights?: DimensionWeights;
  drivesHref: string;
  inspectHref?: string;
  inspectLabel: string;
}

export default function XrayDetail({ id, layer, index, total, layerMaterials, brand, weights, drivesHref, inspectHref, inspectLabel }: XrayDetailProps) {
  const drives = layer ? drivesFor(layer.id, weights || BASE_WEIGHTS) : [];
  const listed = layer && layerMaterials ? (layerMaterials[layer.id] || []).filter(Boolean) : [];

  return (
    <div className={styles.detail} id={id}>
      {layer ? (
        <>
          <div className={styles.detailMain}>
            <p className={styles.detailEyebrow}>
              Layer {pad2(index + 1)} of {pad2(total)}
            </p>
            <p className={styles.detailTitle}>{layer.label}</p>
            <p className={styles.detailBody}>{layer.summary || layer.description}</p>
            {listed.length ? (
              <p className={styles.detailListed}>
                <span className={styles.detailListedLabel}>Listed by {brand || 'the brand'}:</span> {listed.join(' · ')}
              </p>
            ) : null}
          </div>
          {drives.length ? (
            <div className={styles.drives}>
              <p className={styles.drivesLabel}>Drives</p>
              <ul className={styles.chips}>
                {drives.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={drivesHref}
                      className={styles.chip}
                      aria-label={`${d.label}${d.percent !== null ? `, ${d.percent}% of the Match Score` : ''}. How the weights work`}
                    >
                      <span>{d.label}</span>
                      {d.percent !== null ? <span className={styles.chipValue}>{d.percent}%</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className={styles.drivesNote}>{weights ? 'Weights for this profile.' : 'Base weights. Your answers shift them.'}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className={styles.detailPrompt}>Choose a layer to see what it does and which parts of the Match Score it drives.</p>
      )}
      {inspectHref ? (
        <Link href={inspectHref} className={styles.inspect}>
          {inspectLabel} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
