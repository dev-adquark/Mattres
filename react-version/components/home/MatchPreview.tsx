'use client';

import { useId, useState, type ReactNode } from 'react';
import { BedDouble, BedSingle, Flame, Snowflake, Thermometer, Waves, type LucideIcon } from 'lucide-react';
import type { EdgeImportance, MotionSensitivity, PainFocus, SleepTemperature } from '@/lib/types';
import { cssVars } from '@/components/ui/cssVars';
import { MatchResult } from './MatchResult';
import { SleepSurface, alignmentFor, type Alignment } from './SleepSurface';
import { cellIndex, decodeCell, previewProfile, type PreviewSelection } from './previewGrid';
import { useLivePreview } from './useLivePreview';
import type { BandRange, HomePreview } from './types';
import styles from './Match.module.css';

const ALIGN_TEXT: Record<Alignment, (band: BandRange, who: string) => string> = {
  inside: (band, who) => `Inside the ${band.min}–${band.max}/10 comfort range our rules use for a ${who}.`,
  softer: (band, who) => `Softer than the ${band.min}–${band.max}/10 comfort range for a ${who}: hips tend to sink out of line.`,
  firmer: (band, who) => `Firmer than the ${band.min}–${band.max}/10 comfort range for a ${who}: less give where the load is.`,
};

const TEMP_ICON: Record<SleepTemperature, LucideIcon> = { cold: Snowflake, neutral: Thermometer, hot: Flame };
const SHARE_ICON: Record<MotionSensitivity, LucideIcon> = { single: BedSingle, 'couple-low': BedDouble, 'couple-high': Waves };
const TEMP_WORDS: Record<SleepTemperature, string> = { cold: 'sleeps cool', neutral: 'sleeps neutral', hot: 'sleeps warm' };
const SHARE_WORDS: Record<MotionSensitivity, string> = { single: 'sleeps alone', 'couple-low': 'shares the bed', 'couple-high': 'shares the bed, wakes easily' };

const PAIN_WORDS: Record<PainFocus, string> = { none: '', shoulders: 'shoulder pain', hips: 'hip pain', 'lower-back': 'lower-back pain', 'whole-body': 'aches all over' };
const EDGE_WORDS: Record<EdgeImportance, string> = { low: 'rarely uses the edge', medium: '', high: 'uses the edge often' };
/** Where the pressure point sits along an abstract sleep surface (0..1); none = no point. Not a body drawing. */
const PAIN_AT: Record<PainFocus, number | null> = { none: null, shoulders: 0.28, 'lower-back': 0.5, hips: 0.66, 'whole-body': null };
const EDGE_LEVEL: Record<EdgeImportance, number> = { low: 0, medium: 1, high: 2 };

const indexOf = <T extends { id: string }>(list: readonly T[], id: string): number => Math.max(0, list.findIndex((o) => o.id === id));

/** Rising bars: a non-figurative mark for the body-weight band (no human figures). */
function WeightMark({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 20 16" className={styles.segIcon} aria-hidden="true" focusable="false">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={1 + i * 5} y={12 - i * 3.4} width="3.2" height={4 + i * 3.4} rx="0.8" data-on={i <= level ? 'true' : 'false'} />
      ))}
    </svg>
  );
}

/** A surface line with the pressure point marked on it (no human figures). */
function PainMark({ at }: { at: number | null }) {
  return (
    <svg viewBox="0 0 24 16" className={styles.segMark} aria-hidden="true" focusable="false">
      <path d="M2 11.5h20" />
      {at === null ? <path d="M9 6.5h6" data-on="false" /> : <circle cx={2 + at * 20} cy="7" r="2.6" data-on="true" />}
    </svg>
  );
}

/** A mattress end-on with its edge band drawn heavier as edge use rises. */
function EdgeMark({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 24 16" className={styles.segMark} aria-hidden="true" focusable="false">
      <rect x="2" y="5" width="20" height="7" rx="1.5" data-on="false" />
      <rect x={22 - (2 + level * 2)} y="5" width={2 + level * 2} height="7" rx="1" data-on="true" />
    </svg>
  );
}

interface SegmentProps {
  name: string;
  legend: string;
  options: { id: string; label: string; /** Read after the label by screen readers only. */ srExtra?: string; icon?: ReactNode }[];
  value: number;
  onChange: (index: number) => void;
}

/** A row of radio buttons drawn as one segmented control (native arrow-key behaviour). */
function Segment({ name, legend, options, value, onChange }: SegmentProps) {
  return (
    <fieldset className={styles.segRow}>
      <legend className={styles.segLegend}>{legend}</legend>
      <div className={styles.seg} style={cssVars({ '--n': options.length })}>
        {options.map((o, i) => (
          <label key={o.id} className={styles.segOption}>
            <input type="radio" name={name} value={o.id} checked={value === i} onChange={() => onChange(i)} className={styles.segInput} />
            <span className={styles.segFace} data-icon={o.icon ? undefined : 'none'}>
              {o.icon ?? null}
              <span className={styles.segLabel}>
                {o.label}
                {o.srExtra ? <span className="sr-only">{o.srExtra}</span> : null}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface MatchPreviewProps {
  preview: HomePreview;
  /** Chapter marker + h2, rendered on the server. */
  heading: ReactNode;
}

/**
 * The interactive grid of chapter 03: sticky controls (position cards drawn
 * with the SleepSurface system, a feel slider, and body / temperature /
 * sharing toggles, then where it aches, edge use and budget) beside a live
 * surface and the engine's top match. Every combination of the first five
 * answers was scored server-side by the real engine
 * (homeSections.buildPreviewGrid) with the first pain / edge / budget option;
 * any other pain, edge or budget choice is scored live by POST /api/match
 * (useLivePreview), and both are read by previewGrid.topFromRun. Nothing on
 * screen is invented here. The surface is an illustration; its comfort range
 * is the engine's.
 */
export function MatchPreview({ preview, heading }: MatchPreviewProps) {
  const { positions, firmness, weights, temperatures, sharing, pains, edges, budgets, defaults, comfortBands, cells } = preview;
  const uid = useId();
  const [sel, setSel] = useState<PreviewSelection>(() => ({
    position: indexOf(positions, defaults.position),
    firmness: indexOf(firmness, defaults.firmness),
    weight: indexOf(weights, defaults.weight),
    temperature: indexOf(temperatures, defaults.temperature),
    sharing: indexOf(sharing, defaults.sharing),
  }));
  const set = (key: keyof PreviewSelection) => (i: number) => setSel((prev) => (prev[key] === i ? prev : { ...prev, [key]: i }));
  // Pain, edge and budget: the defaults are what the grid was scored with.
  const extraDefaults = { pain: indexOf(pains, defaults.pain), edge: indexOf(edges, defaults.edge), budget: indexOf(budgets, defaults.budget) };
  const [extra, setExtra] = useState(extraDefaults);
  const setX = (key: keyof typeof extra) => (i: number) => setExtra((prev) => (prev[key] === i ? prev : { ...prev, [key]: i }));
  const pain = pains[extra.pain] ?? pains[0];
  const edge = edges[extra.edge] ?? edges[0];
  const budget = budgets[extra.budget] ?? budgets[0];
  const live = extra.pain !== extraDefaults.pain || extra.edge !== extraDefaults.edge || extra.budget !== extraDefaults.budget;
  const pos0 = positions[sel.position];
  const firm0 = firmness[sel.firmness];
  const weight0 = weights[sel.weight];
  const temp0 = temperatures[sel.temperature];
  const share0 = sharing[sel.sharing];
  const liveProfile =
    live && pos0 && firm0 && weight0 && temp0 && share0
      ? previewProfile({
          position: pos0.id,
          firmness: firm0.id,
          weightLb: weight0.weightLb,
          temperature: temp0.id,
          sharing: share0.id,
          pain: pain?.id,
          edge: edge?.id,
          budgetMax: budget?.max ?? null,
        })
      : null;
  const liveState = useLivePreview(liveProfile);

  const pos = positions[sel.position];
  const firm = firmness[sel.firmness];
  const weight = weights[sel.weight];
  const temp = temperatures[sel.temperature];
  const share = sharing[sel.sharing];
  if (!pos || !firm || !weight || !temp || !share) return null;

  const gridTop = decodeCell(preview, cellIndex(preview, sel));
  const top = !live ? gridTop : liveState.status === 'ready' ? liveState.top : null;
  const resultStatus = !live || liveState.status === 'ready' ? 'ready' : liveState.status === 'error' ? 'error' : 'loading';
  const band = comfortBands[`${pos.id}|${weight.id}`];
  const who = `${weight.weightLb} lb ${pos.label.toLowerCase()} sleeper`;
  const align = alignmentFor(firm.value, band);
  const href = `/find-match?position=${encodeURIComponent(pos.id)}&firmness=${encodeURIComponent(firm.id)}`;
  const pctFill = `${(sel.firmness / (firmness.length - 1)) * 100}%`;
  const extraWords = [pain ? PAIN_WORDS[pain.id] : '', edge ? EDGE_WORDS[edge.id] : '', budget && budget.max !== null ? `budget up to ${budget.label}` : ''].filter(Boolean);
  const profileText = [`${who}, ${firm.label.toLowerCase()} feel`, TEMP_WORDS[temp.id], SHARE_WORDS[share.id], ...extraWords].join(', ');
  const cellKey = `${pos.id}-${firm.id}-${weight.id}-${temp.id}-${share.id}-${pain?.id}-${edge?.id}-${budget?.id}`;

  return (
    <div className={styles.grid}>
      <div className={styles.controls}>
        <div className={styles.sticky}>
          {heading}
          <p className={styles.lead}>
            Change any answer and the top match changes with it. The <span className="tabular">{cells.length}</span> core
            profiles were scored ahead of time, and pain, edge and budget are scored as you choose them, all by the same
            v{preview.scoreVersion} engine your full match uses. A sponsored placement is never shown here as a top match.
          </p>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>How do you usually fall asleep?</legend>
            <div className={styles.positions}>
              {positions.map((p, i) => (
                <label key={p.id} className={styles.position}>
                  <input
                    type="radio"
                    name={`${uid}-position`}
                    value={p.id}
                    checked={sel.position === i}
                    onChange={() => set('position')(i)}
                    className={styles.positionInput}
                  />
                  <span className={styles.positionCard}>
                    <SleepSurface
                      position={p.id}
                      firmness={firm.value}
                      weightLb={weight.weightLb}
                      size="glyph"
                      band={comfortBands[`${p.id}|${weight.id}`]}
                      idSeed={`g-${p.id}`}
                      className={styles.glyph}
                    />
                    <span className={styles.positionLabel}>{p.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.fieldset}>
            <label className={styles.legend} htmlFor={`${uid}-firm`}>
              What feel do you prefer? <strong className={styles.firmValue}>{firm.label}</strong>
            </label>
            <input
              id={`${uid}-firm`}
              className={`range ${styles.range}`}
              type="range"
              min={0}
              max={firmness.length - 1}
              step={1}
              value={sel.firmness}
              aria-valuetext={`${firm.label}, about ${firm.value} out of 10`}
              onChange={(e) => set('firmness')(Number(e.target.value))}
              style={cssVars({ '--range-pct': pctFill })}
            />
            <div className={`range-scale ${styles.rangeScale}`} aria-hidden="true">
              <span>Soft</span>
              <span>Extra-firm</span>
            </div>
          </div>

          <div className={styles.profileRows}>
            <Segment
              name={`${uid}-weight`}
              legend="Body weight (lb)"
              value={sel.weight}
              onChange={set('weight')}
              options={weights.map((w, i) => ({ id: w.id, label: w.short, srExtra: ' lb', icon: <WeightMark level={i} /> }))}
            />
            <Segment
              name={`${uid}-temp`}
              legend="At night you run"
              value={sel.temperature}
              onChange={set('temperature')}
              options={temperatures.map((t) => {
                const Icon = TEMP_ICON[t.id];
                return { id: t.id, label: t.label, icon: <Icon className={styles.segIcon} aria-hidden="true" /> };
              })}
            />
            <Segment
              name={`${uid}-share`}
              legend="Who shares the bed"
              value={sel.sharing}
              onChange={set('sharing')}
              options={sharing.map((s) => {
                const Icon = SHARE_ICON[s.id];
                const srExtra = s.id === 'couple-high' ? ', sharing with a partner' : undefined;
                return { id: s.id, label: s.label, srExtra, icon: <Icon className={styles.segIcon} aria-hidden="true" /> };
              })}
            />
            <Segment
              name={`${uid}-pain`}
              legend="Where it aches"
              value={extra.pain}
              onChange={setX('pain')}
              options={pains.map((p) => ({ id: p.id, label: p.label, srExtra: p.id === 'none' ? ', no specific area' : undefined, icon: <PainMark at={PAIN_AT[p.id]} /> }))}
            />
            <Segment
              name={`${uid}-edge`}
              legend="Sitting or sleeping near the edge"
              value={extra.edge}
              onChange={setX('edge')}
              options={edges.map((e) => ({ id: e.id, label: e.label, icon: <EdgeMark level={EDGE_LEVEL[e.id]} /> }))}
            />
            <Segment
              name={`${uid}-budget`}
              legend="Budget, Queen"
              value={extra.budget}
              onChange={setX('budget')}
              options={budgets.map((b) => ({ id: b.id, label: b.max === null ? b.label : `${b.label}`, srExtra: b.max === null ? ' budget, no limit' : ' or less' }))}
            />
          </div>
        </div>
      </div>

      <div className={styles.stage}>
        <figure className={styles.surfaceFigure}>
          <SleepSurface position={pos.id} firmness={firm.value} weightLb={weight.weightLb} band={band} size="lg" idSeed="live" className={styles.surface} />
          <figcaption className={styles.surfaceCaption}>
            <span className={styles.alignDot} data-align={align || 'none'} aria-hidden="true" />
            <span aria-live="polite">{band && align ? ALIGN_TEXT[align](band, who) : `${pos.label} sleeper, ${firm.label.toLowerCase()} feel.`}</span>
            <span className={styles.illus}>Illustration of where load concentrates, not measured pressure data.</span>
          </figcaption>
        </figure>

        <MatchResult
          top={top}
          status={resultStatus}
          errorMessage={liveState.status === 'error' ? liveState.message : null}
          budgetMax={budget?.max ?? null}
          cellKey={cellKey}
          profileText={profileText}
          href={href}
          weight={weight}
        />
      </div>
    </div>
  );
}
