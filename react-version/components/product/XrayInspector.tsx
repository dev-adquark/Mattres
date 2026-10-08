"use client";

import { useCallback, useMemo, useState } from "react";
import { DIMENSION_BY_ID } from "@/lib/explain";
import { cx } from "@/components/ui/cx";
import MattressViewer from "@/components/three/MattressViewer";
import { getDefaultLayers } from "@/components/three/layers";
import type { ScoreCategory } from "@/lib/types";
import {
  PROVENANCE_LABEL,
  firmnessBasisText,
} from "@/components/trust/provenanceCopy";
import { cssVars } from "@/components/ui/cssVars";
import {
  LAYER_DIMENSIONS,
  type LayerId,
  type LayerMaterials,
} from "./productDisplay";
import { useStory, type StoryView } from "./ProductStoryContext";
import styles from "./ProductStory.module.css";

/** One generic layer of the X-ray illustration (components/three/layers). */
interface ViewerLayer {
  id: string;
  label: string;
  description: string;
}

function firstSentence(text: string): string {
  const m = String(text || "").match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : text;
}

function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function pct(sub: number): number {
  return Math.max(0, Math.min(100, Math.round(sub * 10)));
}

function dimensionLabel(d: ScoreCategory): string | undefined {
  return DIMENSION_BY_ID[d]?.label;
}

/** One engine dimension the selected layer drives: sub-score bar, provenance, independent rating. */
function DimensionPerformance({
  dimension,
  view,
  rating,
  firmnessSource,
}: {
  dimension: ScoreCategory;
  view: StoryView | null;
  rating: number | null | undefined;
  firmnessSource: string | null | undefined;
}) {
  const firmnessDriven =
    dimension === "support" || dimension === "pressureRelief";
  const sub = view?.subScores?.[dimension];
  const prov = view?.provenance?.[dimension];
  return (
    <li>
      <div className={styles.perfHead}>
        <span className={styles.perfName}>
          {dimensionLabel(dimension) || dimension}
        </span>
        {typeof sub === "number" ? (
          <span className={styles.perfValue}>
            <strong>{pct(sub)}</strong>/100
          </span>
        ) : (
          <span className={styles.perfMissing}>Not scored</span>
        )}
      </div>
      {typeof sub === "number" ? (
        <div className={styles.perfTrack} aria-hidden="true">
          <span
            className={cx(
              styles.perfFill,
              prov === "estimated" && styles.perfEstimated,
            )}
            style={cssVars({ "--w": pct(sub) / 100 })}
          />
        </div>
      ) : null}
      <p className={styles.perfMeta}>
        <span className={styles.prov} data-prov={prov || "unknown"}>
          {prov ? PROVENANCE_LABEL[prov] : "Data unavailable"}
        </span>
        {typeof rating === "number"
          ? ` · independent rating ${Number.isInteger(rating) ? rating : rating.toFixed(1)}/10`
          : prov === "measured" && firmnessDriven
            ? ` · ${firmnessBasisText(firmnessSource)}`
            : prov === "estimated"
              ? firmnessDriven
                ? " · no firmness on file"
                : " · no independent rating on file"
              : ""}
      </p>
    </li>
  );
}

interface XrayInspectorProps {
  /** Catalog type. */
  type: string;
  brand: string;
  /** From mapMaterialsToLayers(). */
  layerMaterials: LayerMaterials;
  componentCount: number;
  /** Independent 0-10 rating by dimension id. */
  ratings: Partial<Record<string, number | null>>;
  mattressName: string;
  /** Catalog firmnessSource code; names where support/pressure relief come from. */
  firmnessSource?: string | null;
}

/**
 * INSPECT THE MATTRESS: the 3D X-ray (controlled), plus a panel for the
 * selected layer: what the brand lists in it (matched by name), and the
 * engine dimensions that layer mainly drives, with the engine's sub-score
 * for the current view (sourced/estimated) and where the value comes from.
 */
export function XrayInspector({
  type,
  brand,
  layerMaterials,
  componentCount,
  ratings,
  mattressName,
  firmnessSource = null,
}: XrayInspectorProps) {
  const { view } = useStory();
  const layers: ViewerLayer[] = useMemo(() => getDefaultLayers(type), [type]);
  // The viewer's list keeps to one line per layer; the full explanation
  // lives in the insight panel next to the brand's components and scores.
  const listLayers = useMemo(
    () =>
      layers.map((l) => ({ ...l, description: firstSentence(l.description) })),
    [layers],
  );
  // Layer 01 is selected from the start so the insight panel is never empty;
  // clicking the selected layer again keeps it selected (there is always one).
  const [active, setActive] = useState<string | null>(
    () => layers[0]?.id ?? null,
  );
  const selectLayer = useCallback((id: string | null) => {
    if (id) setActive(id);
  }, []);
  const index = layers.findIndex((l) => l.id === active);
  const layer = index >= 0 ? layers[index] : undefined;
  const layerId = layer ? (layer.id as LayerId) : null;
  const dims: ScoreCategory[] = layerId ? LAYER_DIMENSIONS[layerId] || [] : [];
  const listed: string[] = layerId ? layerMaterials[layerId] || [] : [];
  const build = type === "foam" ? "all-foam" : type;

  return (
    <div className={styles.xray}>
      <div className={styles.xrayStage}>
        <MattressViewer
          variant="xray"
          mattressType={type}
          tone="dark"
          background="#0a1020"
          layers={listLayers}
          activeLayerId={active}
          onActiveLayerChange={selectLayer}
          listTitle="Select a layer"
          label={`Illustration of typical ${build} mattress construction with its layers separated. Not a teardown of the ${mattressName}.`}
          caption={`Illustration of a typical ${build} build, not a teardown of the ${mattressName}.`}
        />
      </div>

      {/* Only this one line is announced on each layer change; the panel below is not live. */}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {layer ? `${layer.label}: ${firstSentence(layer.description)}` : ""}
      </p>
      <div className={styles.insight}>
        {layer ? (
          <>
            <div className={styles.insightHead}>
              <p className={styles.insightIndex}>
                Layer {String(index + 1).padStart(2, "0")} of{" "}
                {String(layers.length).padStart(2, "0")}
              </p>
              <h3 className={styles.insightTitle}>{layer.label}</h3>
              <p className={styles.insightBody}>{layer.description}</p>
              <p className={styles.insightAffects}>
                Mainly drives{" "}
                {listText(
                  dims.map((d) => dimensionLabel(d)?.toLowerCase() ?? ""),
                )}
                .
              </p>
            </div>

            <div className={styles.insightCol}>
              <p className={styles.insightLabel}>
                From {brand}&apos;s materials list
              </p>
              {listed.length ? (
                <ul className={styles.insightList}>
                  {listed.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.insightEmpty}>
                  {componentCount
                    ? `Nothing in ${brand}'s published list is named for this layer.`
                    : `${brand} hasn't published a component list we could confirm.`}
                </p>
              )}
              {componentCount ? (
                <p className={styles.insightNote}>
                  Matched to this layer by component name. Thicknesses and
                  densities aren&apos;t published.
                </p>
              ) : null}
            </div>

            <div className={styles.insightCol}>
              <p className={styles.insightLabel}>
                Performance · {view ? view.caption : "reference sleeper"}
              </p>
              <ul className={styles.perf}>
                {dims.map((d) => (
                  <DimensionPerformance
                    key={d}
                    dimension={d}
                    view={view}
                    rating={ratings[d]}
                    firmnessSource={firmnessSource}
                  />
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className={styles.insightIdle}>
            <p className={styles.insightIndex}>{layers.length} layers</p>
            <p className={styles.insightIdleText}>
              Select a layer to see what {brand} lists inside it and how that
              part of the bed scores
              {view
                ? ` for the ${view.mode === "you" ? "profile you entered" : view.caption.toLowerCase()}`
                : ""}
              .
            </p>
            {componentCount ? (
              <p className={styles.insightNote}>
                {componentCount} components from {brand}&apos;s published
                materials list, matched to layers by name.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
